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
import { chatbubblesOutline, addOutline, logOutOutline, megaphoneOutline, chatboxEllipsesOutline } from 'ionicons/icons';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Group, ChatMessage, UserData } from '../types';

const ChatListPage: React.FC = () => {
  const { userData, logout } = useAuth();
  const history = useHistory();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, UserData>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;

    // Ambil semua user (buat nampilin nama di DM)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const map: Record<string, UserData> = {};
      snap.forEach((d) => {
        map[d.id] = { uid: d.id, ...d.data() } as UserData;
      });
      setAllUsers(map);
    });

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

      // Urut: DM duluan, baru grup, lalu broadcast
      const typeOrder = { dm: 0, discussion: 1, broadcast: 2 };
      grpList.sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9));

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

    return () => { unsubUsers(); unsubscribe(); };
  }, [userData]);

  async function handleLogout() {
    await logout();
    history.push('/login');
  }

  function getDMPartner(group: Group): UserData | null {
    if (!userData || group.type !== 'dm') return null;
    // Cari user lain di DM ini
    const partnerUid = group.members.find((uid) => uid !== userData.uid);
    return partnerUid ? allUsers[partnerUid] || null : null;
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  function renderAvatar(group: Group) {
    if (group.type === 'dm') {
      const partner = getDMPartner(group);
      const initial = (partner?.displayName || partner?.email || '?')[0].toUpperCase();
      const colorMap: Record<string, string> = {
        admin: '#f44336',
        broadcaster: '#FF9800',
        member: '#7E57C2',
      };
      return (
        <IonAvatar slot="start">
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: colorMap[partner?.role || 'member'],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: '#fff', fontWeight: 600,
          }}>
            {initial}
          </div>
        </IonAvatar>
      );
    }

    // Grup biasa / broadcast
    return (
      <IonAvatar slot="start">
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: group.type === 'broadcast' ? '#4CAF50' : '#1976d2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          {group.type === 'broadcast' ? '📢' : '💬'}
        </div>
      </IonAvatar>
    );
  }

  function renderBadge(group: Group) {
    if (group.type === 'broadcast') {
      return <IonBadge color="success" slot="end">Broadcast</IonBadge>;
    }
    if (group.type === 'dm') {
      return <IonBadge color="tertiary" slot="end">Personal</IonBadge>;
    }
    return null;
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

        {/* Daftar Chat */}
        {groups.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', marginTop: 60, padding: 20 }}>
            <IonText color="medium">
              <h2>🤷‍♂️ Belum ada obrolan</h2>
              <p>Admin akan menambahkan kamu ke grup. Sabar ya!</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {groups.map((group) => {
              const partner = group.type === 'dm' ? getDMPartner(group) : null;
              const subtitle = group.type === 'dm'
                ? (partner?.email || 'Personal')
                : group.type === 'broadcast'
                  ? `${group.members.length} anggota · Broadcast`
                  : `${group.members.length} anggota · Diskusi`;

              return (
                <IonItem
                  key={group.id}
                  button
                  onClick={() => history.push(`/chat/${group.id}`)}
                >
                  {renderAvatar(group)}
                  <IonLabel>
                    <h2>{group.type === 'dm' ? (partner?.displayName || partner?.email || 'Chat Personal') : group.name}</h2>
                    <p>{lastMessages[group.id] || 'Belum ada pesan'}</p>
                  </IonLabel>
                  {renderBadge(group)}
                </IonItem>
              );
            })}
          </IonList>
        )}

        {/* Tombol + untuk chat baru */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push('/new-chat')}>
            <IonIcon icon={chatboxEllipsesOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default ChatListPage;
