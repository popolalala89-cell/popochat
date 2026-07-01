import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Cari atau buat DM group antara currentUser dan targetUid.
 * Returns groupId jika berhasil, null jika gagal.
 */
export async function getOrCreateDM(
  currentUid: string,
  targetUid: string,
  targetName: string,
): Promise<string | null> {
  if (!currentUid || !targetUid) return null;

  // Cari DM yang udah ada antara kedua user
  const q = query(
    collection(db, 'groups'),
    where('type', '==', 'dm'),
    where('members', 'array-contains', currentUid),
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find((d) => {
    const data = d.data();
    return data.members?.includes(targetUid) && data.type === 'dm';
  });

  if (existing) return existing.id;

  // Buat DM group baru
  const newGroupRef = await addDoc(collection(db, 'groups'), {
    name: targetName,
    members: [currentUid, targetUid],
    type: 'dm',
    dmWith: targetUid,
    createdBy: currentUid,
    createdAt: Date.now(),
  });
  return newGroupRef.id;
}
