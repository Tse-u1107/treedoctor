import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import toast from 'react-hot-toast';
import {
  getUserXpDoc,
  awardXpAndSyncProfile,
  XP_REWARDS,
} from '../../utils/xpUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faLeaf } from '@fortawesome/free-solid-svg-icons';

export default function EcoLesson() {
  const { t } = useTranslation();
  const [pickedByQuiz, setPickedByQuiz] = useState({});
  const [completedQuizIds, setCompletedQuizIds] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
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
        const [xpDoc, quizzesSnap] = await Promise.all([
          getUserXpDoc(id),
          getDocs(query(collection(db, 'teacherQuizzes'), orderBy('createdAt', 'desc'))),
        ]);
        setCompletedQuizIds(Array.isArray(xpDoc.quizDoneIds) ? xpDoc.quizDoneIds : []);

        const teacherQuizzes = quizzesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (teacherQuizzes.length > 0) {
          setQuizzes(teacherQuizzes);
        } else {
          setQuizzes([
            {
              id: 'default-quiz',
              question: t('lesson.question'),
              options: [t('lesson.a1'), t('lesson.a2')],
              correctIndex: 1,
            },
          ]);
        }
      } catch {
        setCompletedQuizIds([]);
        setQuizzes([
          {
            id: 'default-quiz',
            question: t('lesson.question'),
            options: [t('lesson.a1'), t('lesson.a2')],
            correctIndex: 1,
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const submit = async (quiz, optionIndex) => {
    if (completedQuizIds.includes(quiz.id)) {
      toast(t('lesson.already'));
      return;
    }
    setPickedByQuiz((prev) => ({ ...prev, [quiz.id]: optionIndex }));
    const auth = getAuth();
    const u = auth.currentUser;
    if (!u) return;
    const id = `${u.uid.slice(0, 5)}${u.uid.slice(-5)}`;
    if (optionIndex === Number(quiz.correctIndex || 0)) {
      await awardXpAndSyncProfile(id, XP_REWARDS.quiz_pass);
      const nextDone = Array.from(new Set([...completedQuizIds, quiz.id]));
      await setDoc(
        doc(db, 'userXp', id),
        { quizDoneIds: nextDone, updatedAt: new Date() },
        { merge: true }
      );
      setCompletedQuizIds(nextDone);
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
          <div className="space-y-4">
            {quizzes.map((quiz, quizIdx) => {
              const done = completedQuizIds.includes(quiz.id);
              const picked = pickedByQuiz[quiz.id];
              const options = Array.isArray(quiz.options) ? quiz.options : [];
              return (
                <div key={quiz.id} className="rounded-xl border border-green-100 bg-green-50 p-4">
                  <p className="mb-3 text-sm text-green-700">
                    {t('lesson.quizLabel', { defaultValue: 'Сорил' })} {quizIdx + 1}
                  </p>
                  <p className="mb-4 text-lg font-medium text-gray-800">{quiz.question}</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {options.map((label, i) => (
                      <button
                        key={`${quiz.id}-${i}`}
                        type="button"
                        disabled={done}
                        onClick={() => submit(quiz, i)}
                        className={`flex-1 rounded-xl border-2 px-4 py-4 text-left font-medium transition-colors ${
                          picked === i && i !== Number(quiz.correctIndex || 0)
                            ? 'border-red-200 bg-red-50'
                            : 'border-green-200 bg-white hover:border-green-400'
                        } ${done ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {done && <p className="mt-3 text-sm font-medium text-green-700">{t('lesson.correctToast')}</p>}
                </div>
              );
            })}
            {quizzes.length === 0 && (
              <p className="text-sm text-gray-600">
                {t('lesson.noQuiz', { defaultValue: 'Одоогоор сорил нэмэгдээгүй байна.' })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
