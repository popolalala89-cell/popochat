import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCi8QI9OxLY5aaG2z1Okn0q6WWl2eNe2vg',
  authDomain: 'popochat-1eaef.firebaseapp.com',
  projectId: 'popochat-1eaef',
  storageBucket: 'popochat-1eaef.firebasestorage.app',
  messagingSenderId: '915145179377',
  appId: '1:915145179377:web:08a1d1d730c6a38f806950',
  measurementId: 'G-2ZT75GBNJM',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
