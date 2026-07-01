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
} from '@ionic/react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Group } from '../types';
import Confetti from '../components/Confetti';

const TEMPLATE_FORMAL = 'Kepada seluruh rekan, kami informasikan bahwa...';
const TEMPLATE_SANTAI = 'Hai semuanya! Mau ngasih tau nih...';
const TEMPLATE_LUCU = '⚠️ PENGUMUMAN PENTING (tapi santai): ...';

const BroadcastPage: React.FC = () => {
  const history = useHistory();
  const { userData } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [template, setTemplate] = useState<'formal' | 'santai' | 'lucu'>('santai');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

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

  function toggleGroup(groupId: string) {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
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
    if (!message.trim() || selectedGroups.length === 0 || !userData) return;
    setSending(true);

    try {
      const broadcastPromises = selectedGroups.map((groupId) =>
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

      await Promise.all(broadcastPromises);
      setSuccess(true);
      setShowConfetti(true);
      setMessage('');
      setSelectedGroups([]);

      // Redirect setelah 2 detik
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

        {/* Pilih template nada */}
        <IonText>
          <h3 style={{ marginTop: 0 }}>🎵 Pilih Nada</h3>
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
        <IonText>
          <h3>📁 Kirim ke Grup</h3>
        </IonText>
        <IonList>
          {groups.map((g) => (
            <IonItem key={g.id}>
              <IonCheckbox
                slot="start"
                checked={selectedGroups.includes(g.id)}
                onIonChange={() => toggleGroup(g.id)}
              />
              <IonLabel>
                <h2>{g.name}</h2>
                <p>{g.members.length} anggota</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        {/* Tombol Kirim */}
        <IonButton
          expand="block"
          onClick={sendBroadcast}
          disabled={!message.trim() || selectedGroups.length === 0}
          className="ion-margin-top"
        >
          📤 Kirim Broadcast ke {selectedGroups.length} grup
        </IonButton>

        {selectedGroups.length > 0 && (
          <IonText color="medium" style={{ textAlign: 'center', display: 'block', marginTop: 8, fontSize: 12 }}>
            Akan dikirim ke {groups.filter((g) => selectedGroups.includes(g.id)).reduce((sum, g) => sum + g.members.length, 0)} orang
          </IonText>
        )}
      </IonContent>
    </IonPage>
  );
};

export default BroadcastPage;
