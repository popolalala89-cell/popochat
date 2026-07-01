import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonLoading,
} from '@ionic/react';
import { sendOutline, happyOutline, thumbsUpOutline, flameOutline, cafeOutline, rocketOutline } from 'ionicons/icons';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { ChatMessage, Group } from '../types';

const EMOJI_REACTIONS = ['👍', '😂', '🔥', '☕', '🚀'];

const ChatDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<any>(null);

  // Load grup info
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'groups', id), (snap) => {
      if (snap.exists()) setGroup({ id: snap.id, ...snap.data() } as Group);
    });
    return () => unsub();
  }, [id]);

  // Load pesan real-time
  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('groupId', '==', id),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
      setLoading(false);

      // Auto-scroll ke bawah
      setTimeout(() => {
        contentRef.current?.scrollToBottom(300);
      }, 100);
    });

    return () => unsub();
  }, [id]);

  async function sendMessage() {
    if (!text.trim() || !currentUser || !group) return;

    const msg: Omit<ChatMessage, 'id'> = {
      groupId: id,
      senderId: currentUser.uid,
      senderName: userData?.displayName || 'Unknown',
      type: 'text',
      content: text.trim(),
      timestamp: Date.now(),
      reactions: {},
      isBroadcast: group.type === 'broadcast',
    };

    try {
      await addDoc(collection(db, 'messages'), msg);
      setText('');
    } catch (err) {
      console.error('Gagal kirim pesan:', err);
    }
  }

  async function addReaction(messageId: string, emoji: string) {
    if (!currentUser) return;
    const msgRef = doc(db, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const msgData = msgSnap.data() as ChatMessage;
    const reactions = msgData.reactions || {};
    const existing = reactions[emoji] || [];

    if (existing.includes(currentUser.uid)) {
      // Batal reaksi
      reactions[emoji] = existing.filter((uid) => uid !== currentUser.uid);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...existing, currentUser.uid];
    }

    await setDoc(msgRef, { reactions }, { merge: true });
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/chats" />
          </IonButtons>
          <IonTitle>{group?.name || 'Chat'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef}>
        <IonLoading isOpen={loading} message="Memuat pesan..." />

        <div style={{ padding: 16 }}>
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;
            const emojiCount = Object.values(msg.reactions || {}).reduce((sum, arr) => sum + arr.length, 0);

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}
              >
                {/* Nama pengirim */}
                {!isMe && (
                  <IonText color="medium" style={{ fontSize: 12, marginBottom: 2, marginLeft: 4 }}>
                    {msg.senderName}
                  </IonText>
                )}

                {/* Bubble chat */}
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMe ? '#1976d2' : '#f0f0f0',
                    color: isMe ? '#fff' : '#000',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: 15, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                  <div style={{
                    fontSize: 11,
                    opacity: 0.7,
                    textAlign: 'right',
                    marginTop: 4,
                  }}>
                    {formatTime(msg.timestamp)}
                  </div>

                  {/* Reaksi */}
                  {emojiCount > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: 2,
                      marginTop: 4,
                      flexWrap: 'wrap',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                    }}>
                      {Object.entries(msg.reactions || {}).map(([emoji, users]) =>
                        users.length > 0 ? (
                          <span
                            key={emoji}
                            style={{
                              background: '#fff',
                              borderRadius: 12,
                              padding: '2px 6px',
                              fontSize: 13,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              cursor: 'pointer',
                            }}
                            onClick={() => addReaction(msg.id, emoji)}
                          >
                            {emoji} {users.length}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>

                {/* Tombol reaksi (hidden for now, tap tahan nanti) */}
              </div>
            );
          })}
        </div>
      </IonContent>

      {/* Input bar */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid #e0e0e0',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <IonInput
          value={text}
          onIonChange={(e) => setText(e.detail.value!)}
          placeholder="Ketik pesan..."
          style={{
            background: '#f5f5f5',
            borderRadius: 24,
            padding: '0 16px',
            flex: 1,
          }}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <IonButton
          onClick={sendMessage}
          disabled={!text.trim()}
          style={{ borderRadius: '50%', width: 44, height: 44, '--padding-start': 0, '--padding-end': 0 }}
        >
          <IonIcon icon={sendOutline} />
        </IonButton>
      </div>
    </IonPage>
  );
};

export default ChatDetailPage;
