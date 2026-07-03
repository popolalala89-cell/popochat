import { useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

let showToastFn: ((msg: string, sender: string, groupId: string) => void) | null = null;

/**
 * Registrasi fungsi toast global dari App.tsx
 */
export function registerShowToast(
  fn: (msg: string, sender: string, groupId: string) => void
) {
  showToastFn = fn;
}

/**
 * useToastNotifications — listener untuk notifikasi in-app (toast)
 * Muncul tiap ada pesan baru dari grup yang user ikuti,
 * kecuali user sedang di halaman chat tersebut.
 */
export function useToastNotifications() {
  const { currentUser, userData } = useAuth();
  const lastNotifiedRef = useRef<string>('');

  useEffect(() => {
    if (!currentUser || !showToastFn) return;

    // Cari grup mana aja yang user ini ikuti
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', currentUser.uid)
    );

    const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
      // Ambil semua groupId
      const groupIds: string[] = [];
      snapshot.forEach((d) => groupIds.push(d.id));

      if (groupIds.length === 0) return;

      // Listen pesan baru di grup-grup ini
      // Karena Firestore gak support IN dengan onSnapshot,
      // kita listen ke semua messages terbaru & filter di client
      const msgQuery = query(
        collection(db, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      const unsubMsgs = onSnapshot(msgQuery, (msgSnap) => {
        for (const change of msgSnap.docChanges()) {
          if (change.type !== 'added') continue;

          const msg = change.doc.data();
          const msgId = change.doc.id;

          // Skip kalo ini pesan kita sendiri
          if (msg.senderId === currentUser.uid) continue;

          // Skip kalo bukan dari grup yang kita ikuti
          if (!groupIds.includes(msg.groupId)) continue;

          // Skip kalo lagi di halaman chat itu
          const path = window.location.pathname;
          if (path === `/chat/${msg.groupId}`) continue;

          // Skip duplikat (realtime bisa double fire)
          if (lastNotifiedRef.current === msgId) continue;
          lastNotifiedRef.current = msgId;

          // Show toast
          const preview = msg.content?.substring(0, 120) || '(gambar/stiker)';
          showToastFn(preview, msg.senderName || 'Seseorang', msg.groupId);
          break; // cuma 1 toast per batch
        }
      });

      // Cleanup message listener ketika grup berubah
      return () => unsubMsgs();
    });

    return () => unsubGroups();
  }, [currentUser?.uid]);
}
