import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonIcon,
  IonFab,
  IonFabButton,
  IonText,
  IonRefresher,
  IonRefresherContent,
  IonBadge,
  IonLoading,
} from '@ionic/react';
import { chatbubblesOutline, addOutline, logOutOutline, megaphoneOutline } from 'ionicons/icons';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Group, ChatMessage } from '../types';

const ChatListPage: React.FC = () => {
  const { userData, logout } = useAuth();
  const history = useHistory();
  const [groups, setGroups] = useState<Group[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;

    // Ambil grup yang anggotanya termasuk user ini
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userData.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const grpList: Group[] = [];
      snapshot.forEach((doc) => {
        grpList.push({ id: doc.id, ...doc.data() } as Group);
      });
      setGroups(grpList);

      // Ambil pesan terakhir tiap grup
      grpList.forEach((g) => {
        const msgQuery = query(
          collection(db, 'messages'),
          where('groupId', '==', g.id),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        onSnapshot(msgQuery, (msgSnap) => {
          if (!msgSnap.empty) {
            const msg = msgSnap.docs[0].data() as ChatMessage;
            setLastMessages((prev) => ({
              ...prev,
              [g.id]: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
            }));
          }
        });
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  async function handleLogout() {
    await logout();
    history.push('/login');
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  return (
    <IonPage>
      <IonContent>
        <IonLoading isOpen={loading} message="Memuat obrolan..." />

        {/* Header */}
        <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>💬 Chat</h1>
            <IonText color="medium">
              <p style={{ margin: '4px 0 0', fontSize: 14 }}>
                {userData?.displayName || '...'} · {userData?.statusMood || 'Semangat 45 🚀'}
              </p>
            </IonText>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(userData?.role === 'admin' || userData?.role === 'broadcaster') && (
              <IonIcon
                icon={megaphoneOutline}
                size="large"
                style={{ padding: 8, cursor: 'pointer' }}
                onClick={() => history.push('/broadcast')}
              />
            )}
            <IonIcon
              icon={logOutOutline}
              size="large"
              style={{ padding: 8, cursor: 'pointer' }}
              onClick={handleLogout}
            />
          </div>
        </div>

        {/* Daftar Grup */}
        {groups.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', marginTop: 60, padding: 20 }}>
            <IonText color="medium">
              <h2>🤷‍♂️ Belum ada grup</h2>
              <p>Admin akan menambahkan kamu ke grup. Sabar ya!</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {groups.map((group) => (
              <IonItem
                key={group.id}
                button
                onClick={() => history.push(`/chat/${group.id}`)}
              >
                <IonAvatar slot="start">
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: group.type === 'broadcast' ? '#4CAF50' : '#1976d2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    {group.type === 'broadcast' ? '📢' : '💬'}
                  </div>
                </IonAvatar>
                <IonLabel>
                  <h2>{group.name}</h2>
                  <p>{lastMessages[group.id] || 'Belum ada pesan'}</p>
                </IonLabel>
                {group.type === 'broadcast' && (
                  <IonBadge color="success" slot="end">Broadcast</IonBadge>
                )}
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ChatListPage;
