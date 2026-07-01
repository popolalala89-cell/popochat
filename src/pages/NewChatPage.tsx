import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonText,
  IonSearchbar,
  IonLoading,
  IonIcon,
  IonBadge,
} from '@ionic/react';
import { personAddOutline } from 'ionicons/icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { UserData } from '../types';
import { getOrCreateDM } from '../utils/dm';

const NewChatPage: React.FC = () => {
  const { userData } = useAuth();
  const history = useHistory();
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserData[] = [];
      snap.forEach((d) => list.push({ uid: d.id, ...d.data() } as UserData));
      // Urut: admin dulu, broadcaster, lalu member
      const roleOrder = { admin: 0, broadcaster: 1, member: 2 };
      list.sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));
      setAllUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function startChat(targetUser: UserData) {
    if (!userData) return;
    if (targetUser.uid === userData.uid) return;

    setCreating(true);
    try {
      const groupId = await getOrCreateDM(
        userData.uid,
        targetUser.uid,
        targetUser.displayName || targetUser.email || 'User',
      );
      if (groupId) {
        history.push(`/chat/${groupId}`);
      }
    } catch (err) {
      console.error('Gagal buat DM:', err);
    }
    setCreating(false);
  }

  const filtered = allUsers.filter((u) => {
    if (u.uid === userData?.uid) return false; // jangan tampilkan diri sendiri
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const colorMap: Record<string, string> = {
    admin: '#f44336',
    broadcaster: '#FF9800',
    member: '#7E57C2',
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/chats" />
          </IonButtons>
          <IonTitle>👤 Chat Baru</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonLoading isOpen={loading} message="Memuat pengguna..." />
        <IonLoading isOpen={creating} message="Membuat obrolan..." />

        {/* Search */}
        <IonSearchbar
          value={search}
          onIonChange={(e) => setSearch(e.detail.value!)}
          placeholder="Cari pengguna..."
          debounce={300}
        />

        {/* Daftar user */}
        {filtered.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', marginTop: 60, padding: 20 }}>
            <IonText color="medium">
              <h2>🔍 Tidak ditemukan</h2>
              <p>Tidak ada pengguna dengan nama atau email tersebut</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {filtered.map((u) => (
              <IonItem
                key={u.uid}
                button
                onClick={() => startChat(u)}
              >
                <IonAvatar slot="start">
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: colorMap[u.role] || '#9e9e9e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: '#fff', fontWeight: 600,
                  }}>
                    {(u.displayName || u.email || '?')[0].toUpperCase()}
                  </div>
                </IonAvatar>
                <IonLabel>
                  <h2>{u.displayName || 'Tanpa Nama'}</h2>
                  <p>{u.email}</p>
                </IonLabel>
                <IonIcon
                  slot="end"
                  icon={personAddOutline}
                  style={{ fontSize: 22, color: '#1976d2' }}
                />
                <IonBadge
                  color={u.role === 'admin' ? 'danger' : u.role === 'broadcaster' ? 'warning' : 'tertiary'}
                  slot="end"
                  style={{ marginRight: 8 }}
                >
                  {u.role}
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Info jumlah */}
        <IonText color="medium" style={{ textAlign: 'center', display: 'block', margin: 16, fontSize: 12 }}>
          {allUsers.length - 1} pengguna lain · tap untuk mulai chat
        </IonText>
      </IonContent>
    </IonPage>
  );
};

export default NewChatPage;
