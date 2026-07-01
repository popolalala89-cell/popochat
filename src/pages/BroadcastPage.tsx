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
  IonTextarea,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonText,
  IonSegment,
  IonSegmentButton,
  IonLoading,
  IonAvatar,
} from '@ionic/react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  setDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Group, UserData } from '../types';
import Confetti from '../components/Confetti';

const TEMPLATE_FORMAL = 'Kepada seluruh rekan, kami informasikan bahwa...';
const TEMPLATE_SANTAI = 'Hai semuanya! Mau ngasih tau nih...';
const TEMPLATE_LUCU = '⚠️ PENGUMUMAN PENTING (tapi santai): ...';

const BroadcastPage: React.FC = () => {
  const history = useHistory();
  const { userData } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [template, setTemplate] = useState<'formal' | 'santai' | 'lucu'>('santai');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [broadcastType, setBroadcastType] = useState<'group' | 'personal'>('group');

  // Load grup yang user ini jadi anggota
  useEffect(() => {
    if (!userData) return;
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userData.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const grpList: Group[] = [];
      snap.forEach((doc) => grpList.push({ id: doc.id, ...doc.data() } as Group));
      setGroups(grpList);
    });
    return () => unsub();
  }, [userData]);

  // Load semua user (buat broadcast personal)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const userList: UserData[] = [];
      snap.forEach((d) => userList.push({ uid: d.id, ...d.data() } as UserData));
      setAllUsers(userList);
    });
    return () => unsub();
  }, []);

  async function getOrCreateDM(targetUid: string): Promise<string | null> {
    if (!userData) return null;
    // Cari DM group yang udah ada
    const q = query(
      collection(db, 'groups'),
      where('dmWith', '==', targetUid)
    );
    const snap = await getDocs(q);
    const existing = snap.docs.find(
      (d) => (d.data() as any).type === 'dm' && d.data().members?.includes(userData.uid)
    );
    if (existing) return existing.id;

    // Buat DM group baru
    const targetUser = allUsers.find((u) => u.uid === targetUid);
    const dmName = targetUser?.displayName || targetUser?.email || 'User';
    const newGroupRef = await addDoc(collection(db, 'groups'), {
      name: dmName,
      members: [userData.uid, targetUid],
      type: 'dm',
      dmWith: targetUid,
      createdBy: userData.uid,
      createdAt: Date.now(),
    });
    return newGroupRef.id;
  }

  function toggleGroup(groupId: string) {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }

  function toggleUser(uid: string) {
    setSelectedUsers((prev) =>
      prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid]
    );
  }

  function applyTemplate() {
    switch (template) {
      case 'formal': setMessage(TEMPLATE_FORMAL); break;
      case 'santai': setMessage(TEMPLATE_SANTAI); break;
      case 'lucu': setMessage(TEMPLATE_LUCU); break;
    }
  }

  async function sendBroadcast() {
    if (!message.trim() || !userData) return;

    if (broadcastType === 'group' && selectedGroups.length === 0) return;
    if (broadcastType === 'personal' && selectedUsers.length === 0) return;

    setSending(true);

    try {
      if (broadcastType === 'group') {
        // Broadcast ke grup
        const promises = selectedGroups.map((groupId) =>
          addDoc(collection(db, 'messages'), {
            groupId,
            senderId: userData.uid,
            senderName: userData.displayName,
            type: 'text',
            content: message.trim(),
            timestamp: Date.now(),
            reactions: {},
            isBroadcast: true,
            template,
          })
        );
        await Promise.all(promises);
      } else {
        // Broadcast personal — buat/ambil DM group dulu, lalu kirim
        const promises = selectedUsers.map(async (targetUid) => {
          const dmGroupId = await getOrCreateDM(targetUid);
          if (!dmGroupId) return;
          await addDoc(collection(db, 'messages'), {
            groupId: dmGroupId,
            senderId: userData.uid,
            senderName: userData.displayName,
            type: 'text',
            content: message.trim(),
            timestamp: Date.now(),
            reactions: {},
            isBroadcast: true,
            template,
          });
        });
        await Promise.all(promises);
      }

      setSuccess(true);
      setShowConfetti(true);
      setMessage('');
      setSelectedGroups([]);
      setSelectedUsers([]);

      setTimeout(() => {
        history.push('/chats');
      }, 2000);
    } catch (err) {
      console.error('Gagal broadcast:', err);
    }
    setSending(false);
  }

  if (!userData || (userData.role !== 'admin' && userData.role !== 'broadcaster')) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonBackButton defaultHref="/chats" /></IonButtons>
            <IonTitle>Broadcast</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <h2>🚫 Akses Terbatas</h2>
            <p>Hanya admin dan broadcaster yang bisa kirim broadcast.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <Confetti active={showConfetti} />
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/chats" /></IonButtons>
          <IonTitle>📢 Broadcast</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonLoading isOpen={sending} message="Mengirim broadcast..." />
        <IonLoading isOpen={success} message="✅ Broadcast terkirim!" duration={2000} />

        {/* Pilih tipe broadcast */}
        <IonSegment
          value={broadcastType}
          onIonChange={(e) => setBroadcastType(e.detail.value as 'group' | 'personal')}
        >
          <IonSegmentButton value="group">📢 Grup</IonSegmentButton>
          <IonSegmentButton value="personal">👤 Personal</IonSegmentButton>
        </IonSegment>

        {/* Pilih template nada */}
        <IonText>
          <h3 style={{ marginTop: 16 }}>🎵 Pilih Nada</h3>
        </IonText>
        <IonSegment
          value={template}
          onIonChange={(e) => setTemplate(e.detail.value as 'formal' | 'santai' | 'lucu')}
        >
          <IonSegmentButton value="formal">📋 Formal</IonSegmentButton>
          <IonSegmentButton value="santai">😊 Santai</IonSegmentButton>
          <IonSegmentButton value="lucu">😂 Lucu</IonSegmentButton>
        </IonSegment>

        <IonButton
          expand="block"
          fill="outline"
          size="small"
          onClick={applyTemplate}
          className="ion-margin-top"
        >
          Pakai Template {template}
        </IonButton>

        {/* Pesan */}
        <IonText>
          <h3>✍️ Pesan</h3>
        </IonText>
        <IonTextarea
          value={message}
          onIonChange={(e) => setMessage(e.detail.value!)}
          placeholder="Tulis pesan broadcast..."
          rows={5}
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 8,
            marginBottom: 16,
          }}
        />

        {/* Pilih grup */}
        {broadcastType === 'group' && (
          <>
            <IonText>
              <h3>📁 Kirim ke Grup</h3>
            </IonText>
            <IonList>
              {groups.filter((g) => g.type !== 'dm').map((g) => (
                <IonItem key={g.id}>
                  <IonCheckbox
                    slot="start"
                    checked={selectedGroups.includes(g.id)}
                    onIonChange={() => toggleGroup(g.id)}
                  />
                  <IonLabel>
                    <h2>{g.name}</h2>
                    <p>{g.members.length} anggota · {g.type === 'broadcast' ? '📢 Broadcast' : '💬 Diskusi'}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
            {groups.filter((g) => g.type !== 'dm').length === 0 && (
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>Belum ada grup. Buat dulu di menu Admin ya 😄</p>
              </IonText>
            )}
          </>
        )}

        {/* Pilih user (personal DM) */}
        {broadcastType === 'personal' && (
          <>
            <IonText>
              <h3>👤 Kirim ke User</h3>
            </IonText>
            <IonList>
              {allUsers
                .filter((u) => u.uid !== userData?.uid) // jangan termasuk diri sendiri
                .map((u) => (
                  <IonItem key={u.uid}>
                    <IonCheckbox
                      slot="start"
                      checked={selectedUsers.includes(u.uid)}
                      onIonChange={() => toggleUser(u.uid)}
                    />
                    <IonAvatar slot="start">
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: u.role === 'admin' ? '#f44336' : u.role === 'broadcaster' ? '#FF9800' : '#9e9e9e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, color: '#fff', fontWeight: 600,
                      }}>
                        {(u.displayName || u.email || '?')[0].toUpperCase()}
                      </div>
                    </IonAvatar>
                    <IonLabel>
                      <h2>{u.displayName || 'Tanpa Nama'}</h2>
                      <p>{u.email} · {u.role}</p>
                    </IonLabel>
                  </IonItem>
                ))}
            </IonList>
          </>
        )}

        {/* Tombol Kirim */}
        <IonButton
          expand="block"
          onClick={sendBroadcast}
          disabled={
            !message.trim() ||
            (broadcastType === 'group' && selectedGroups.length === 0) ||
            (broadcastType === 'personal' && selectedUsers.length === 0)
          }
          className="ion-margin-top"
        >
          {broadcastType === 'group'
            ? `📤 Kirim Broadcast ke ${selectedGroups.length} grup`
            : `📤 Kirim Personal ke ${selectedUsers.length} user`
          }
        </IonButton>

        {broadcastType === 'group' && selectedGroups.length > 0 && (
          <IonText color="medium" style={{ textAlign: 'center', display: 'block', marginTop: 8, fontSize: 12 }}>
            Akan dikirim ke {groups.filter((g) => selectedGroups.includes(g.id)).reduce((sum, g) => sum + g.members.length, 0)} orang
          </IonText>
        )}
      </IonContent>
    </IonPage>
  );
};

export default BroadcastPage;
