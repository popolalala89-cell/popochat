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
  IonSearchbar,
} from '@ionic/react';
import { addOutline, removeOutline, checkmarkOutline, shieldOutline, personOutline } from 'ionicons/icons';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { UserData, Group } from '../types';

const AdminPage: React.FC = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Timeout 5 detik — biar gak loading forever kalo snapshot error
    const timeoutId = setTimeout(() => setLoading(false), 5000);

    // Ambil semua users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const userList: UserData[] = [];
      snap.forEach((d) => userList.push({ uid: d.id, ...d.data() } as UserData));
      setUsers(userList);
    });

    // Ambil semua groups
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snap) => {
      const grpList: Group[] = [];
      snap.forEach((d) => grpList.push({ id: d.id, ...d.data() } as Group));
      setGroups(grpList);
      clearTimeout(timeoutId);
      setLoading(false);
    });

    return () => { clearTimeout(timeoutId); unsubUsers(); unsubGroups(); };
  }, []);

  async function createGroup() {
    if (!newGroupName.trim() || !userData) return;
    setCreating(true);
    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupName.trim(),
        members: [...selectedMembers, userData.uid], // creator otomatis jadi member
        type: newGroupType,
        createdBy: userData.uid,
        createdAt: Date.now(),
      });
      setNewGroupName('');
      setSelectedMembers([]);
      setShowCreateGroup(false);
    } catch (err) {
      console.error('Gagal buat grup:', err);
    }
    setCreating(false);
  }

  async function changeRole(uid: string, role: 'member' | 'broadcaster' | 'admin') {
    await updateDoc(doc(db, 'users', uid), { role });
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
    if (confirm('Hapus grup ini? Pesan di dalamnya juga akan hilang.')) {
      await deleteDoc(doc(db, 'groups', groupId));
      setShowManageGroup(false);
    }
  }

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
      </IonHeader>

      <IonContent>
        <IonLoading isOpen={loading} message="Memuat..." />

        {/* Grup Section */}
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

        {/* Users Section */}
        <div style={{ padding: '0 16px 16px' }}>
          <h3>👥 Pengguna ({users.length})</h3>
          <IonList>
            {users.map((u) => (
              <IonItem key={u.uid}>
                <IonIcon
                  icon={u.role === 'admin' ? shieldOutline : personOutline}
                  slot="start"
                  style={{ color: roleColors[u.role] || '#999', fontSize: 24 }}
                />
                <IonLabel>
                  <h2>{u.displayName || 'Tanpa Nama'}</h2>
                  <p>{u.email}</p>
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

        {/* Modal: Create Group */}
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
                  {selectedMembers.includes(u.uid) ? 'Terpilih' : 'Pilih'}
                </IonChip>
              </IonItem>
            ))}

            <IonButton expand="block" onClick={createGroup} disabled={!newGroupName.trim() || creating} className="ion-margin-top">
              {creating ? 'Membuat...' : 'Buat Grup'}
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Modal: Manage Group */}
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
      </IonContent>
    </IonPage>
  );
};

export default AdminPage;
