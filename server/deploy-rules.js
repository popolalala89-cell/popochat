#!/usr/bin/env node
const admin = require('firebase-admin');
const https = require('https');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'service-account.json'), 'utf8')
);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const projectId = serviceAccount.project_id;
const rulesContent = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

function request(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 300)}`));
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const { access_token } = await admin.credential.cert(serviceAccount).getAccessToken();
  console.log('✅ Got access token');

  // Create ruleset
  const rulesetRes = await request(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    'POST',
    { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: rulesContent }] } })
  );
  const rulesetName = JSON.parse(rulesetRes).name;
  console.log(`✅ Ruleset: ${rulesetName}`);

  // Create/update release via POST
  const releaseRes = await request(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
    'POST',
    { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    JSON.stringify({
      name: `projects/${projectId}/releases/cloud.firestore`,
      rulesetName,
    })
  );
  const releaseData = JSON.parse(releaseRes);
  console.log(`✅ Release: ${releaseData.name}`);

  // Cleanup old rulesets (keep only last 5)
  const listRes = await request(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets?pageSize=100`,
    'GET',
    { Authorization: `Bearer ${access_token}` }
  );
  const rulesets = JSON.parse(listRes).rulesets || [];
  if (rulesets.length > 5) {
    const toDelete = rulesets.slice(5);
    for (const rs of toDelete) {
      await request(
        `https://firebaserules.googleapis.com/v1/${rs.name}`,
        'DELETE',
        { Authorization: `Bearer ${access_token}` }
      );
    }
    console.log(`🧹 Cleaned up ${toDelete.length} old rulesets`);
  }

  console.log('✅ Firestore rules deployed successfully!');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
