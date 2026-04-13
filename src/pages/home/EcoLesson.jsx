import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  getUserXpDoc,
  awardXpAndSyncProfile,
  markQuizDone,
  XP_REWARDS,
} from '../../utils/xpUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faLeaf } from '@fortawesome/free-solid-svg-icons';

const CORRECT_INDEX = 1;

export default function EcoLesson() {
  const { t } = useTranslation();
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const auth = getAuth();
      const u = auth.currentUser;
      if (!u) {
        setLoading(false);
        return;
      }
      const id = `${u.uid.slice(0, 5)}${u.uid.slice(-5)}`;
      try {
        const docSnap = await getUserXpDoc(id);
        setDone(!!docSnap.quizDone);
      } catch {
        setDone(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const options = [t('lesson.a1'), t('lesson.a2')];

  const submit = async (index) => {
    if (done) {
      toast(t('lesson.already'));
      return;
    }
    setPicked(index);
    const auth = getAuth();
    const u = auth.currentUser;
    if (!u) return;
    const id = `${u.uid.slice(0, 5)}${u.uid.slice(-5)}`;
    if (index === CORRECT_INDEX) {
      await awardXpAndSyncProfile(id, XP_REWARDS.quiz_pass);
      await markQuizDone(id);
      setDone(true);
      toast.success(t('lesson.correctToast'));
    } else {
      toast.error(t('lesson.wrongToast'));
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <FontAwesomeIcon icon={faGraduationCap} className="text-2xl text-green-700" />
        <h1 className="text-2xl font-bold text-green-800">{t('lesson.title')}</h1>
      </div>
      <p className="mb-6 text-green-700">{t('lesson.intro')}</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <FontAwesomeIcon icon={faLeaf} className="text-4xl animate-pulse text-green-500" />
        </div>
      ) : (
        <>
          <p className="mb-4 text-lg font-medium text-gray-800">{t('lesson.question')}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {options.map((label, i) => (
              <button
                key={label}
                type="button"
                disabled={done}
                onClick={() => submit(i)}
                className={`flex-1 rounded-xl border-2 px-4 py-4 text-left font-medium transition-colors ${
                  picked === i && i !== CORRECT_INDEX
                    ? 'border-red-200 bg-red-50'
                    : 'border-green-200 bg-green-50 hover:border-green-400'
                } ${done ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          {done && (
            <p className="mt-6 text-sm font-medium text-green-700">{t('lesson.correctToast')}</p>
          )}
        </>
      )}
    </div>
  );
}
