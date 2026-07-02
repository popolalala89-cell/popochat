/**
 * Popochat FCM Notification Server
 * 
 * Cara pakai:
 * 1. Download service account key dari Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 * 2. Simpan sebagai server/service-account.json
 * 3. Copy .env.example ke .env dan isi
 * 4. npm install && npm start
 * 
 * Atau via environment variables:
 *   export FIREBASE_PROJECT_ID=popochat-1eaef
 *   export FIREBASE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
 *   export FIREBASE_PRIVATE_KEY="[REDACTED PRIVATE KEY]\n"
 *   node index.js
 */

require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ─── Firebase Admin Init ───────────────────────────────────────────
let serviceAccount;

// Priority 1: file service-account.json
const saPath = path.join(__dirname, 'service-account.json');
if (fs.existsSync(saPath)) {
  serviceAccount = require(saPath);
  console.log('[FCM] Using service-account.json');
}
// Priority 2: environment variables
else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
  console.log('[FCM] Using environment variables');
} else {
  console.error('');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('  ERROR: Firebase credentials not found!');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('  Buat file server/service-account.json dengan');
  console.error('  service account key dari Firebase Console:');
  console.error('  → Project Settings → Service Accounts');
  console.error('  → Generate New Private Key');
  console.error('');
  console.error('  Atau set env variables:');
  console.error('  FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,');
  console.error('  FIREBASE_PRIVATE_KEY');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const messaging = admin.messaging();

// ─── Rate Limiter ──────────────────────────────────────────────────
const RATE_LIMIT_PER_SEC = 400;
let tokensThisSecond = 0;
let lastReset = Date.now();

function checkRateLimit() {
  const now = Date.now();
  if (now - lastReset >= 1000) {
    tokensThisSecond = 0;
    lastReset = now;
  }
  if (tokensThisSecond >= RATE_LIMIT_PER_SEC) {
    const wait = 1000 - (now - lastReset);
    return new Promise((resolve) => setTimeout(resolve, wait + 50));
  }
  tokensThisSecond++;
  return Promise.resolve();
}

// ─── Notifikasi Sudah Dikirim (tracking) ─────────────────────────
const NOTIFY_COLLECTION = '_fcm_sent';

async function isAlreadyNotified(msgId) {
  const doc = await db.collection(NOTIFY_COLLECTION).doc(msgId).get();
  return doc.exists;
}

async function markNotified(msgId, stats) {
  await db.collection(NOTIFY_COLLECTION).doc(msgId).set({
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    total: stats.total,
    success: stats.success,
    failed: stats.failed,
  });
}

// ─── Kirim FCM ─────────────────────────────────────────────────────
async function sendFCM(token, sound, msg, group) {
  await checkRateLimit();

  // Tentukan title & type notifikasi berdasarkan tipe grup
  let title, notifType;
  if (group.type === 'broadcast') {
    title = `📢 ${msg.senderName || 'Broadcast'}`;
    notifType = 'broadcast';
  } else if (group.type === 'dm') {
    title = msg.senderName || 'Pesan Personal';
    notifType = 'dm';
  } else {
    title = `${msg.senderName || 'Seseorang'} (${group.name || 'Grup'})`;
    notifType = 'discussion';
  }

  const message = {
    token,
    notification: {
      title,
      body: msg.content?.substring(0, 200) || 'Pesan baru',
    },
    android: {
      notification: {
        channelId: 'pesan_baru',
        sound: sound || 'default',
        priority: 'high',
        visibility: 1,
        tag: msg.groupId,
        sticky: false,
      },
    },
    data: {
      groupId: msg.groupId,
      type: notifType,
      click_action: 'OPEN_CHAT',
    },
  };

  await messaging.send(message);
}

// ─── Handle Semua Pesan Baru ─────────────────────────────────────
async function handleNewMessage(msg, msgId) {
  try {
    const groupDoc = await db.collection('groups').doc(msg.groupId).get();
    if (!groupDoc.exists) {
      console.log(`[FCM] ❌ Group ${msg.groupId} not found, skipping`);
      return;
    }

    const group = groupDoc.data();
    const memberIds = group.members || [];
    const preview = msg.content?.substring(0, 50) || '(gambar/stiker)';
    const groupLabel = group.type === 'dm' ? 'DM' : group.name || 'Grup';
    console.log(`[FCM] 💬 ${groupLabel} \"${preview}...\"`);
    console.log(`[FCM]    Sender: ${msg.senderName || msg.senderId} (${memberIds.length} members)`);

    // Ambil token FCM semua anggota (kecuali pengirim)
    const tokenPromises = memberIds
      .filter(uid => uid !== msg.senderId)
      .map(async (uid) => {
        try {
          const userDoc = await db.collection('users').doc(uid).get();
          if (!userDoc.exists) return null;
          const userData = userDoc.data();
          if (!userData.tokenFCM) return null;
          return {
            token: userData.tokenFCM,
            sound: userData.preferences?.notificationSound || 'default',
            uid,
          };
        } catch {
          return null;
        }
      });

    const tokenResults = await Promise.all(tokenPromises);
    const recipients = tokenResults.filter(Boolean);

    if (recipients.length === 0) {
      console.log(`[FCM] ⚠️  No FCM tokens found — skip`);
      return;
    }

    console.log(`[FCM] 📱 Sending to ${recipients.length} devices...`);

    // Kirim dalam batch parallel (maks 100 per batch)
    const BATCH_SIZE = 100;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(r => sendFCM(r.token, r.sound, msg, group))
      );

      const batchOk = results.filter(r => r.status === 'fulfilled').length;
      const batchFail = results.filter(r => r.status === 'rejected').length;
      success += batchOk;
      failed += batchFail;

      if (batchFail > 0) {
        results.forEach((r, idx) => {
          if (r.status === 'rejected') {
            console.log(`[FCM]    ✗ ${batch[idx].uid}: ${r.reason?.message || r.reason}`);
          }
        });
      }

      console.log(`[FCM]    Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recipients.length / BATCH_SIZE)}: ${batchOk} OK, ${batchFail} fail`);
    }

    // Simpan status notifikasi
    await markNotified(msgId, { total: recipients.length, success, failed });

    console.log(`[FCM] ✅ Msg ${msgId} done: ${success} sent, ${failed} failed`);
  } catch (err) {
    console.error(`[FCM] 🔴 Error handling msg ${msgId}:`, err);
  }
}

// ─── Firestore Listener ────────────────────────────────────────────
// Mendengarkan SEMUA pesan baru — broadcast, DM, diskusi grup
console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║   Popochat FCM Notification Server   ║');
console.log('╚══════════════════════════════════════╝');
console.log('');
console.log(`[FCM] Listening for ALL new messages...`);
console.log('');

const unsubscribe = db.collection('messages')
  .onSnapshot(async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type !== 'added') continue;

      const msgId = change.doc.id;
      const msg = change.doc.data();

      // Skip kalau udah dinotifikasi sebelumnya
      const already = await isAlreadyNotified(msgId);
      if (already) continue;

      await handleNewMessage(msg, msgId);
    }
  }, (err) => {
    console.error('[FCM] 🔴 Firestore listener error:', err);
    // Auto reconnect after 5 seconds
    setTimeout(() => {
      console.log('[FCM] Attempting to reconnect...');
    }, 5000);
  });

// ─── Graceful Shutdown ─────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[FCM] Shutting down...');
  unsubscribe();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[FCM] Shutting down...');
  unsubscribe();
  process.exit(0);
});

// ─── Health Check (via PID file) ───────────────────────────────────
try {
  fs.writeFileSync(path.join(__dirname, 'server.pid'), String(process.pid));
} catch (e) {
  // Gagal nulis PID file — gapapa
}
