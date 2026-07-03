import { useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

// Deteksi apakah dijalankan di Capacitor native atau browser biasa
function isNative(): boolean {
  return !!(window as any).Capacitor?.isNative;
}

async function checkAndRegisterToken(uid: string, cancelledRef: { current: boolean }) {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Cek apakah token udah ada di Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));
    const existingToken = userDoc.data()?.tokenFCM;
    if (existingToken) {
      console.log('[FCM] Token already registered:', existingToken.substring(0, 20) + '...');
      return;
    }

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      console.log('[FCM] Permission not granted:', permStatus.receive);
      return;
    }

    // Register for push
    await PushNotifications.register();

    // Listen for token
    PushNotifications.addListener('registration', async (token) => {
      if (cancelledRef.current) return;
      await updateDoc(doc(db, 'users', uid), {
        tokenFCM: token.value,
      });
      console.log('[FCM] Token saved:', token.value.substring(0, 20) + '...');
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[FCM] Registration error:', err);
    });
  } catch (err) {
    console.log('[FCM] Registration skipped:', err);
  }
}

export function useFCM() {
  const { currentUser, userData } = useAuth();
  const cancelledRef = useRef(false);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!currentUser) return;
    if (!isNative()) {
      console.log('[FCM] Skipped: running in browser dev mode');
      return;
    }

    cancelledRef.current = false;

    // Register pertama kali
    checkAndRegisterToken(currentUser.uid, cancelledRef);

    // Retry tiap kali app dapet focus (biar bisa register setelah izin diaktifkan manual)
    function onFocus() {
      if (cancelledRef.current) return;
      // Cek apakah token sudah ada — kalo belum, coba register ulang
      checkAndRegisterToken(currentUser.uid, cancelledRef);
    }
    window.addEventListener('focus', onFocus);

    return () => {
      cancelledRef.current = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser?.uid]);
}
