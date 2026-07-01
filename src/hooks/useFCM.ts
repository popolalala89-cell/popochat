import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

// Deteksi apakah dijalankan di Capacitor native atau browser biasa
function isNative(): boolean {
  return !!(window as any).Capacitor?.isNative;
}

export function useFCM() {
  const { currentUser, userData } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    // Skip FCM jika bukan native Capacitor (misal: browser dev)
    if (!isNative()) {
      console.log('[FCM] Skipped: running in browser dev mode');
      return;
    }

    let cancelled = false;

    async function registerPush() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Request permission
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') return;

        // Register for push
        await PushNotifications.register();

        // Listen for token
        PushNotifications.addListener('registration', async (token) => {
          if (cancelled || !currentUser) return;
          // Simpan token FCM ke Firestore
          await updateDoc(doc(db, 'users', currentUser.uid), {
            tokenFCM: token.value,
          });
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('FCM registration error:', err);
        });

        // Listen for notification tapped
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received:', notification);
        });
      } catch (err) {
        console.log('Push registration skipped:', err);
      }
    }

    registerPush();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);
}
