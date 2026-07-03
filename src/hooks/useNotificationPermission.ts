import { useEffect, useRef, useState } from 'react';

type NotifPermStatus = 'unknown' | 'granted' | 'denied' | 'requesting';

/**
 * useNotificationPermission
 *
 * Flow perijinan notifikasi (POST_NOTIFICATIONS) di Android 13+:
 * - 'prompt'  → tampilkan dialog sistem (popup)
 * - 'denied'  → set needsSettings=true biar UI bisa ngasih tahu user
 * - 'granted' → aman, ga perlu apa-apa
 *
 * Returns { status, needsSettings } buat dipake komponen UI.
 */
export function useNotificationPermission() {
  const calledRef = useRef(false);
  const [status, setStatus] = useState<NotifPermStatus>('unknown');

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const isNative = !!((window as any).Capacitor?.isNative);
    if (!isNative) {
      setStatus('granted'); // browser mode, skip
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const mod = await import('@capacitor/push-notifications');
        const pn = mod.PushNotifications;

        // Langsung cek status
        const perm = await pn.checkPermissions();
        console.log('[NotifPerm] Status:', perm.receive);

        if (perm.receive === 'prompt') {
          // Minta izin → muncul dialog sistem
          setStatus('requesting');
          const result = await pn.requestPermissions();
          console.log('[NotifPerm] Result:', result.receive);

          if (result.receive === 'granted') {
            setStatus('granted');
          } else {
            // User menekan Deny di dialog
            setStatus('denied');
          }
        } else if (perm.receive === 'denied') {
          // Pernah di deny sebelumnya — dialog gak muncul lagi
          setStatus('denied');
        } else {
          setStatus('granted');
        }
      } catch (err) {
        console.error('[NotifPerm] Error:', err);
        setStatus('granted'); // fail-safe: anggap granted
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return {
    status,
    needsSettings: status === 'denied',
  };
}
