import { useEffect, useRef } from 'react';

/**
 * useNotificationPermission — request izin notifikasi (POST_NOTIFICATIONS)
 * saat app pertama kali dibuka, tanpa nunggu login.
 * Untuk Android 13+ (API 33), ini wajib di-runtime request.
 */
export function useNotificationPermission() {
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    // Deteksi apakah di Capacitor native
    const isNative = !!(window as any).Capacitor?.isNative;
    if (!isNative) {
      console.log('[NotifPerm] Skipped: running in browser');
      return;
    }

    // Request izin notifikasi dengan delay kecil biar app sempat render dulu
    const timer = setTimeout(async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        const permStatus = await PushNotifications.checkPermissions();
        console.log('[NotifPerm] Current status:', permStatus.receive);

        if (permStatus.receive === 'prompt') {
          const result = await PushNotifications.requestPermissions();
          console.log('[NotifPerm] After request:', result.receive);
        } else if (permStatus.receive === 'denied') {
          console.log('[NotifPerm] Previously denied — user must enable manually in Settings');
        } else {
          console.log('[NotifPerm] Already granted');
        }
      } catch (err) {
        console.log('[NotifPerm] Error:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);
}
