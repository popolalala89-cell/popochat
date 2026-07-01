import React, { useState, useRef } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonAvatar,
  IonText,
  IonSelect,
  IonSelectOption,
  IonLoading,
} from '@ionic/react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const WALLPAPERS = [
  { value: 'default', label: 'Polos' },
  { value: 'batik', label: 'Batik' },
  { value: 'kopi', label: 'Kopi' },
  { value: 'awan', label: 'Awan' },
];

const SOUNDS = [
  { value: 'default', label: 'Ting (default)' },
  { value: 'mesintik', label: 'Mesin Tik' },
  { value: 'walkie', label: 'Walkie-Talkie' },
  { value: 'gamelan', label: 'Gamelan Mini' },
  { value: 'kucing', label: 'Kucing Imut' },
];

const MOODS = ['Semangat 45 🚀', 'Butuh Kopi ☕', 'Pusing Deadline 😵', 'Santuy 🦥', 'Mode Robot 🤖', 'Lapar 🍜'];

const ProfilePage: React.FC = () => {
  const { userData } = useAuth();
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [statusMood, setStatusMood] = useState(userData?.preferences.theme || 'default');
  const [theme, setTheme] = useState(userData?.preferences.theme || 'default');
  const [wallpaper, setWallpaper] = useState(userData?.preferences.wallpaper || 'default');
  const [sound, setSound] = useState(userData?.preferences.notificationSound || 'default');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveProfile() {
    if (!userData) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        displayName,
        statusMood,
        preferences: { theme, wallpaper, notificationSound: sound },
      });
    } catch (err) {
      console.error('Gagal simpan profil:', err);
    }
    setSaving(false);
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userData) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${userData.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', userData.uid), { avatarUrl: url });
    } catch (err) {
      console.error('Gagal upload avatar:', err);
    }
    setUploading(false);
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/chats" /></IonButtons>
          <IonTitle>Profil</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonLoading isOpen={saving} message="Menyimpan..." />
        <IonLoading isOpen={uploading} message="Upload avatar..." />

        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <IonAvatar style={{ margin: '0 auto', width: 80, height: 80 }}>
            <img
              src={userData?.avatarUrl || `https://ui-avatars.com/api/?name=${userData?.displayName}&background=1976d2&color=fff`}
              alt="avatar"
            />
          </IonAvatar>
          <input
            type="file"
            ref={fileInputRef}
            onChange={uploadAvatar}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <IonButton
            fill="clear"
            size="small"
            onClick={() => fileInputRef.current?.click()}
          >
            Ganti Foto
          </IonButton>
        </div>

        {/* Info Akun */}
        <IonItem>
          <IonLabel position="stacked">Nama</IonLabel>
          <IonInput value={displayName} onIonChange={(e) => setDisplayName(e.detail.value!)} />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Email</IonLabel>
          <IonInput value={userData?.email || ''} disabled />
        </IonItem>

        <IonItem>
          <IonLabel>Status Mood</IonLabel>
          <IonSelect value={statusMood} onIonChange={(e) => setStatusMood(e.detail.value)}>
            {MOODS.map((m) => (
              <IonSelectOption key={m} value={m}>{m}</IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        {/* Tema */}
        <IonText>
          <h3 style={{ marginTop: 24 }}>🎨 Tampilan</h3>
        </IonText>

        <IonItem>
          <IonLabel>Tema</IonLabel>
          <IonSelect value={theme} onIonChange={(e) => setTheme(e.detail.value)}>
            <IonSelectOption value="default">Serius (Default)</IonSelectOption>
            <IonSelectOption value="santai">Santai (Pastel)</IonSelectOption>
            <IonSelectOption value="dark">Dark Mode</IonSelectOption>
          </IonSelect>
        </IonItem>

        <IonItem>
          <IonLabel>Wallpaper Chat</IonLabel>
          <IonSelect value={wallpaper} onIonChange={(e) => setWallpaper(e.detail.value)}>
            {WALLPAPERS.map((w) => (
              <IonSelectOption key={w.value} value={w.value}>{w.label}</IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        {/* Suara Notifikasi */}
        <IonText>
          <h3 style={{ marginTop: 24 }}>🔔 Suara Notifikasi</h3>
        </IonText>

        <IonItem>
          <IonLabel>Pilih Suara</IonLabel>
          <IonSelect value={sound} onIonChange={(e) => setSound(e.detail.value)}>
            {SOUNDS.map((s) => (
              <IonSelectOption key={s.value} value={s.value}>{s.label}</IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonButton expand="block" onClick={saveProfile} disabled={saving} className="ion-margin-top">
          Simpan Profil
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
