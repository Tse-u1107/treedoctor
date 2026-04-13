import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const XP_REWARDS = {
  tree_registered: 100,
  water: 20,
  photo_log: 10,
  quiz_pass: 50,
};

export function getLevelInfo(xp) {
  const n = Number(xp) || 0;
  if (n >= 5000) {
    return { key: 'forest_master', min: 5000, nextAt: null };
  }
  if (n >= 500) {
    return { key: 'assistant', min: 500, nextAt: 5000 };
  }
  return { key: 'new_planter', min: 0, nextAt: 500 };
}

export function xpProgress(xp) {
  const info = getLevelInfo(xp);
  if (!info.nextAt) return { pct: 100, remaining: 0 };
  const prev = info.key === 'new_planter' ? 0 : 500;
  const span = info.nextAt - prev;
  const cur = Math.max(0, xp - prev);
  return { pct: Math.min(100, Math.round((cur / span) * 100)), remaining: Math.max(0, info.nextAt - xp) };
}

export async function getUserXpDoc(userId) {
  const ref = doc(db, 'userXp', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : { xp: 0, quizDone: false };
}

export async function awardXp(userId, amount, meta = {}) {
  if (!userId || !amount) return { xp: 0 };
  const ref = doc(db, 'userXp', userId);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? Number(snap.data().xp) || 0 : 0;
  const next = prev + amount;
  await setDoc(
    ref,
    {
      xp: next,
      updatedAt: new Date(),
      ...meta,
    },
    { merge: true }
  );
  return { xp: next, gained: amount };
}

export async function markQuizDone(userId) {
  const ref = doc(db, 'userXp', userId);
  await setDoc(ref, { quizDone: true, updatedAt: new Date() }, { merge: true });
}

export async function awardXpAndSyncProfile(userId, amount) {
  await awardXp(userId, amount);
}
