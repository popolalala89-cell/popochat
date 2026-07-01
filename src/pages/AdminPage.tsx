import React, { useEffect, useState } from 'react';
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
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonChip,
  IonIcon,
  IonText,
  IonModal,
  IonLoading,
  IonSegment,
  IonSegmentButton,
  IonCard,
  IonCardContent,
  IonToggle,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import {
  addOutline,
  removeOutline,
  shieldOutline,
  personOutline,
  peopleOutline,
  chatbubbleOutline,
  paperPlaneOutline,
  happyOutline,
  sadOutline,
  downloadOutline,
  timeOutline,
  checkmarkCircle,
  closeCircle,
  storefrontOutline,
} from 'ionicons/icons';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, deleteDoc, limit as firestoreLimit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { UserData, Group, ChatMessage } from '../types';

// ─── Types ──────────────────────────────────────────────────────────
type AdminTab = 'dashboard' | 'groups' | 'users';

interface AppSettings {
  seriousMode: boolean;
  updatedAt: Timestamp | null;
  updatedBy: string;
}

const AdminPage: React.FC = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Data
  const [users, setUsers] = useState<UserData[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [broadcasts, setBroadcasts] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({ seriousMode: false, updatedAt: null, updatedBy: '' });
  const [toastMsg, setToastMsg] = useState('');

  // Create group modal
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'broadcast' | 'discussion'>('broadcast');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Manage group modal
  const [showManageGroup, setShowManageGroup] = useState(false);
  const [manageGroup, setManageGroup] = useState<Group | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => setLoading(false), 5000);

    // Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserData[] = [];
      snap.forEach((d) => list.push({ uid: d.id, ...d.data() } as UserData));
      setUsers(list);
    });

    // Groups
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snap) => {
      const list: Group[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Group));
      setGroups(list);
    });

    // Broadcast terakhir (20)
    const unsubBroadcasts = onSnapshot(
      query(
        collection(db, 'messages'),
        where('isBroadcast', '==', true),
        orderBy('timestamp', 'desc'),
        firestoreLimit(20)
      ),
      (snap) => {
        const list: ChatMessage[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ChatMessage));
        setBroadcasts(list);
      }
    );

    // Global settings
    const unsubSettings = onSnapshot(doc(db, '_settings', 'global'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as AppSettings);
      }
    }, () => {
      // Settings doc belum ada — itu normal
    });

    return () => {
      clearTimeout(timeoutId);
      unsubUsers();
      unsubGroups();
      unsubBroadcasts();
      unsubSettings();
    };
  }, []);

  // ─── Groups ──────────────────────────────────────────────────────
  async function createGroup() {
    if (!newGroupName.trim() || !userData) return;
    setCreating(true);
    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupName.trim(),
        members: [...selectedMembers, userData.uid],
        type: newGroupType,
        createdBy: userData.uid,
        createdAt: Date.now(),
      });
      setNewGroupName('');
      setSelectedMembers([]);
      setShowCreateGroup(false);
      setToastMsg(`Grup "${newGroupName.trim()}" berhasil dibuat`);
    } catch (err) {
      console.error('Gagal buat grup:', err);
      setToastMsg('Gagal membuat grup');
    }
    setCreating(false);
  }

  async function changeRole(uid: string, role: 'member' | 'broadcaster' | 'admin') {
    await updateDoc(doc(db, 'users', uid), { role });
    setToastMsg(`Role user berhasil diubah ke ${role}`);
  }

  async function addToGroup(group: Group, uid: string) {
    if (group.members.includes(uid)) return;
    await updateDoc(doc(db, 'groups', group.id), {
      members: arrayUnion(uid),
    });
  }

  async function removeFromGroup(group: Group, uid: string) {
    await updateDoc(doc(db, 'groups', group.id), {
      members: arrayRemove(uid),
    });
  }

  async function deleteGroup(groupId: string) {
    if (confirm('Hapus grup ini? Semua pesan di dalamnya tetap tersimpan.')) {
      await deleteDoc(doc(db, 'groups', groupId));
      setShowManageGroup(false);
      setToastMsg('Grup berhasil dihapus');
    }
  }

  // ─── Dashboard ───────────────────────────────────────────────────
  async function toggleSeriousMode() {
    if (!userData) return;
    const newValue = !settings.seriousMode;
    await setDoc(doc(db, '_settings', 'global'), {
      seriousMode: newValue,
      updatedAt: Timestamp.now(),
      updatedBy: userData.uid,
    }, { merge: true });
    setToastMsg(newValue ? '🔇 Mode Serius AKTIF — stiker & efek lucu dinonaktifkan' : '🎉 Mode Santai — semua fitur lucu aktif kembali');
  }

  function exportUsers() {
    const csv = [
      ['Email', 'Nama', 'Role', 'Token FCM', 'Mood'].join(','),
      ...users.map(u =>
        [u.email, u.displayName || '', u.role || 'member', u.tokenFCM ? '✅' : '❌', u.statusMood || ''].join(',')
      ),
    ].join('\n');

    // Copy ke clipboard via iOS/Web API
    if (navigator.clipboard) {
      navigator.clipboard.writeText(csv).then(() => {
        setToastMsg(`📋 ${users.length} user — data sudah di-copy ke clipboard (format CSV)`);
      });
    } else {
      // Fallback: download as file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `popochat-users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToastMsg(`📥 ${users.length} user — file CSV terdownload`);
    }
  }

  function getTodayBroadcasts(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return broadcasts.filter(b => {
      return b.timestamp >= today.getTime();
    }).length;
  }

  function getUsersWithToken(): number {
    return users.filter(u => u.tokenFCM).length;
  }

  function formatDate(ts: number | Timestamp | undefined): string {
    if (!ts) return '-';
    const d = typeof ts === 'number' ? new Date(ts) : ts.toDate();
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // ─── Render ──────────────────────────────────────────────────────
  if (!userData || userData.role !== 'admin') {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonBackButton defaultHref="/chats" /></IonButtons>
            <IonTitle>Admin</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <h2>🔒 Hanya Admin</h2>
            <p>Halaman ini khusus untuk admin.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const roleColors: Record<string, string> = {
    admin: '#f44336',
    broadcaster: '#FF9800',
    member: '#9e9e9e',
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/chats" /></IonButtons>
          <IonTitle>🛠️ Panel Admin</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={activeTab} onIonChange={(e) => setActiveTab(e.detail.value as AdminTab)}>
            <IonSegmentButton value="dashboard">
              <IonIcon icon={storefrontOutline} />
              <IonLabel>Dashboard</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="groups">
              <IonIcon icon={peopleOutline} />
              <IonLabel>Grup</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="users">
              <IonIcon icon={personOutline} />
              <IonLabel>Pengguna</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonLoading isOpen={loading} message="Memuat..." />

        {/* ════════════════════ DASHBOARD ════════════════════ */}
        {activeTab === 'dashboard' && (
          <div style={{ padding: 16 }}>
            {/* Stat Cards */}
            <IonGrid>
              <IonRow>
                <IonCol size="6">
                  <IonCard style={{ margin: 0, marginBottom: 12 }}>
                    <IonCardContent style={{ textAlign: 'center' }}>
                      <IonIcon icon={personOutline} style={{ fontSize: 32, color: '#1976d2' }} />
                      <h2 style={{ margin: '8px 0 0', fontSize: 28 }}>{users.length}</h2>
                      <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Total Pengguna</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#4CAF50' }}>
                        📱 {getUsersWithToken()} siap notif
                      </p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard style={{ margin: 0, marginBottom: 12 }}>
                    <IonCardContent style={{ textAlign: 'center' }}>
                      <IonIcon icon={peopleOutline} style={{ fontSize: 32, color: '#FF9800' }} />
                      <h2 style={{ margin: '8px 0 0', fontSize: 28 }}>{groups.length}</h2>
                      <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Total Grup</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999' }}>
                        📢 {groups.filter(g => g.type === 'broadcast').length} broadcast
                      </p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6">
                  <IonCard style={{ margin: 0, marginBottom: 12 }}>
                    <IonCardContent style={{ textAlign: 'center' }}>
                      <IonIcon icon={paperPlaneOutline} style={{ fontSize: 32, color: '#4CAF50' }} />
                      <h2 style={{ margin: '8px 0 0', fontSize: 28 }}>{getTodayBroadcasts()}</h2>
                      <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Broadcast Hari Ini</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard
                    style={{ margin: 0, marginBottom: 12 }}
                    onClick={toggleSeriousMode}
                  >
                    <IonCardContent style={{ textAlign: 'center', cursor: 'pointer' }}>
                      <IonIcon
                        icon={settings.seriousMode ? sadOutline : happyOutline}
                        style={{ fontSize: 32, color: settings.seriousMode ? '#666' : '#FF9800' }}
                      />
                      <h2 style={{ margin: '8px 0 0', fontSize: 16 }}>
                        {settings.seriousMode ? '🔇 Mode Serius' : '🎉 Mode Santai'}
                      </h2>
                      <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Tap untuk toggle</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* Broadcast Terakhir */}
            <h3 style={{ marginTop: 16 }}>📡 Broadcast Terakhir</h3>
            <IonList>
              {broadcasts.length === 0 && (
                <IonItem>
                  <IonLabel className="ion-text-center" style={{ color: '#999', padding: 16 }}>
                    Belum ada broadcast
                  </IonLabel>
                </IonItem>
              )}
              {broadcasts.slice(0, 10).map((b) => (
                <IonItem key={b.id}>
                  <IonIcon icon={paperPlaneOutline} slot="start" style={{ color: '#1976d2' }} />
                  <IonLabel>
                    <h2 style={{ fontSize: 14 }}>{b.senderName}</h2>
                    <p style={{ fontSize: 12 }}>{b.content?.substring(0, 80)}{b.content?.length > 80 ? '...' : ''}</p>
                  </IonLabel>
                  <div slot="end" style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 11, color: '#999', margin: 0 }}>{formatDate(b.timestamp)}</p>
                  </div>
                </IonItem>
              ))}
            </IonList>

            {/* Export & Settings */}
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <IonButton fill="outline" size="small" onClick={exportUsers}>
                <IonIcon icon={downloadOutline} slot="start" /> Export CSV
              </IonButton>
            </div>
          </div>
        )}

        {/* ════════════════════ GROUPS ════════════════════ */}
        {activeTab === 'groups' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>📁 Grup ({groups.length})</h3>
              <IonButton size="small" onClick={() => setShowCreateGroup(true)}>
                <IonIcon icon={addOutline} slot="start" /> Buat Grup
              </IonButton>
            </div>

            <IonList>
              {groups.map((g) => (
                <IonItem key={g.id} button onClick={() => { setManageGroup(g); setShowManageGroup(true); }}>
                  <IonLabel>
                    <h2>{g.name}</h2>
                    <p>{g.members.length} anggota · {g.type === 'broadcast' ? '📢 Broadcast' : '💬 Diskusi'}</p>
                  </IonLabel>
                  <IonChip slot="end" color={g.type === 'broadcast' ? 'success' : 'primary'}>
                    {g.members.length}
                  </IonChip>
                </IonItem>
              ))}
            </IonList>
          </div>
        )}

        {/* ════════════════════ USERS ════════════════════ */}
        {activeTab === 'users' && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>👥 Pengguna ({users.length})</h3>
              <IonButton fill="outline" size="small" onClick={exportUsers}>
                <IonIcon icon={downloadOutline} slot="start" /> Export
              </IonButton>
            </div>

            <IonList>
              {users.map((u) => (
                <IonItem key={u.uid}>
                  <IonIcon
                    icon={u.role === 'admin' ? shieldOutline : personOutline}
                    slot="start"
                    style={{ color: roleColors[u.role] || '#999', fontSize: 24 }}
                  />
                  <IonLabel>
                    <h2 style={{ fontSize: 15 }}>{u.displayName || 'Tanpa Nama'}</h2>
                    <p style={{ fontSize: 12 }}>{u.email} {u.tokenFCM ? '📱' : ''}</p>
                  </IonLabel>
                  <IonSelect
                    value={u.role}
                    onIonChange={(e) => changeRole(u.uid, e.detail.value)}
                    interface="popover"
                    style={{ minWidth: 120 }}
                  >
                    <IonSelectOption value="member">Member</IonSelectOption>
                    <IonSelectOption value="broadcaster">Broadcaster</IonSelectOption>
                    <IonSelectOption value="admin">Admin</IonSelectOption>
                  </IonSelect>
                </IonItem>
              ))}
            </IonList>
          </div>
        )}

        {/* ─── Modal: Create Group ────────────────────────────── */}
        <IonModal isOpen={showCreateGroup} onDidDismiss={() => setShowCreateGroup(false)}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start"><IonButton onClick={() => setShowCreateGroup(false)}>Batal</IonButton></IonButtons>
              <IonTitle>Buat Grup Baru</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput
              value={newGroupName}
              onIonChange={(e) => setNewGroupName(e.detail.value!)}
              placeholder="Nama grup..."
              label="Nama Grup"
              labelPlacement="stacked"
            />
            <IonSelect
              value={newGroupType}
              onIonChange={(e) => setNewGroupType(e.detail.value)}
              label="Tipe Grup"
              labelPlacement="stacked"
              style={{ marginTop: 16 }}
            >
              <IonSelectOption value="broadcast">📢 Broadcast (satu arah)</IonSelectOption>
              <IonSelectOption value="discussion">💬 Diskusi (dua arah)</IonSelectOption>
            </IonSelect>

            <h4 style={{ marginTop: 24 }}>Pilih Anggota</h4>
            {users.map((u) => (
              <IonItem key={u.uid}>
                <IonLabel>{u.displayName || u.email}</IonLabel>
                <IonChip
                  color={selectedMembers.includes(u.uid) ? 'primary' : 'medium'}
                  onClick={() => {
                    setSelectedMembers((prev) =>
                      prev.includes(u.uid) ? prev.filter((id) => id !== u.uid) : [...prev, u.uid]
                    );
                  }}
                >
                  {selectedMembers.includes(u.uid) ? '✓' : 'Pilih'}
                </IonChip>
              </IonItem>
            ))}

            <IonButton expand="block" onClick={createGroup} disabled={!newGroupName.trim() || creating} className="ion-margin-top">
              {creating ? 'Membuat...' : 'Buat Grup'}
            </IonButton>
          </IonContent>
        </IonModal>

        {/* ─── Modal: Manage Group ─────────────────────────────── */}
        <IonModal isOpen={showManageGroup} onDidDismiss={() => setShowManageGroup(false)}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start"><IonButton onClick={() => setShowManageGroup(false)}>Tutup</IonButton></IonButtons>
              <IonTitle>{manageGroup?.name}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonText>
              <h4>Anggota ({manageGroup?.members.length || 0})</h4>
            </IonText>
            <IonList>
              {users
                .filter((u) => manageGroup?.members.includes(u.uid))
                .map((u) => (
                  <IonItem key={u.uid}>
                    <div
                      slot="start"
                      style={{
                        width: 8, height: 8, borderRadius: 4,
                        background: roleColors[u.role],
                      }}
                    />
                    <IonLabel>
                      {u.displayName || u.email}
                      <p>{u.role}</p>
                    </IonLabel>
                    <IonButton
                      fill="clear"
                      color="danger"
                      onClick={() => manageGroup && removeFromGroup(manageGroup, u.uid)}
                    >
                      <IonIcon icon={removeOutline} />
                    </IonButton>
                  </IonItem>
                ))}
            </IonList>

            <IonText>
              <h4>Tambah Anggota</h4>
            </IonText>
            {users
              .filter((u) => !manageGroup?.members.includes(u.uid))
              .map((u) => (
                <IonItem key={u.uid}>
                  <IonLabel>{u.displayName || u.email}</IonLabel>
                  <IonButton
                    fill="clear"
                    color="success"
                    onClick={() => manageGroup && addToGroup(manageGroup, u.uid)}
                  >
                    <IonIcon icon={addOutline} />
                  </IonButton>
                </IonItem>
              ))}

            <IonButton
              expand="block"
              color="danger"
              fill="outline"
              onClick={() => manageGroup && deleteGroup(manageGroup.id)}
              className="ion-margin-top"
            >
              Hapus Grup Ini
            </IonButton>
          </IonContent>
        </IonModal>

        {/* ─── Toast ──────────────────────────────────────────── */}
        <IonToast
          isOpen={!!toastMsg}
          message={toastMsg}
          duration={3000}
          onDidDismiss={() => setToastMsg('')}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminPage;
