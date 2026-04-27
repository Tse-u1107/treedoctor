import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { useAuth } from '../../../context/AuthContext';

const dateKey = (d = new Date()) => d.toISOString().split('T')[0];

export default function StudentJournal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const userId = useMemo(() => {
    if (!user?.uid) return '';
    return `${user.uid.slice(0, 5)}${user.uid.slice(-5)}`;
  }, [user]);

  const today = dateKey();

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        const ref = doc(db, 'userTrees', userId, 'journals', today);
        const snap = await getDoc(ref);
        if (snap.exists()) setText(snap.data().note || '');
      } catch (e) {
        console.error('Load journal failed', e);
      }
    };
    load();
  }, [today, userId]);

  const onSave = async () => {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    try {
      const ref = doc(db, 'userTrees', userId, 'journals', today);
      await setDoc(
        ref,
        {
          note: text,
          dateKey: today,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaved(true);
    } catch (e) {
      console.error('Save journal failed', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-lg sm:p-6">
      <h2 className="text-xl font-bold text-green-800 sm:text-2xl">{t('journal.title')}</h2>
      <p className="mt-2 text-sm text-green-700 sm:text-base">{t('journal.subtitle')}</p>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">{t('journal.todayLabel', { date: today })}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-40 w-full rounded-lg border border-green-200 p-3 text-sm focus:border-green-500 focus:outline-none"
          placeholder={t('journal.placeholder')}
          maxLength={1000}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>{text.length}/1000</span>
          {saved && <span className="text-green-700">{t('journal.saved')}</span>}
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="mt-4 min-h-11 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-70"
      >
        {saving ? t('journal.saving') : t('journal.save')}
      </button>
    </div>
  );
}
