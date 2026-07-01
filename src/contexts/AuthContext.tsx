import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserData } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchOrCreateUserDoc(user: User) {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserData;
    }
    // Auto-create jika belum ada (misal user dibuat via Firebase Console)
    const newUser: UserData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      avatarUrl: '',
      statusMood: 'Semangat 45 🚀',
      tokenFCM: '',
      role: 'member',
      preferences: {
        theme: 'default',
        wallpaper: 'default',
        notificationSound: 'default',
      },
      badges: [],
      points: 0,
      createdAt: Date.now(),
    };
    await setDoc(ref, newUser);
    return newUser;
  }

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const data = await fetchOrCreateUserDoc(user);
          if (!cancelled) setUserData(data);
        } catch (err) {
          console.error('Gagal fetch user doc:', err);
          // Tetap lanjut walau error — biar gak loading selamanya
          if (!cancelled) setUserData(null);
        }
      } else {
        setUserData(null);
      }
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  async function refreshUserData() {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    if (snap.exists()) {
      setUserData(snap.data() as UserData);
    }
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Buat dokumen user di Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName,
      avatarUrl: '',
      statusMood: 'Semangat 45 🚀',
      tokenFCM: '',
      role: 'member',
      preferences: {
        theme: 'default',
        wallpaper: 'default',
        notificationSound: 'default',
      },
      badges: [],
      points: 0,
      createdAt: Date.now(),
    });
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function logout() {
    await signOut(auth);
  }

  const value = { currentUser, userData, loading, login, register, logout, resetPassword, refreshUserData };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
