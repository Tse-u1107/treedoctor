import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../../../firebase';
import { getProvinceLabelMn } from '../../constants/provinces';

const roleIsTeacher = (docData) => (docData?.role || '').toLowerCase() === 'teacher';

export default function TeacherDashboard({ section = 'overview' }) {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [teacherPosts, setTeacherPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [newsStatus, setNewsStatus] = useState('');
  const newsFormRef = useRef(null);
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '']);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState(0);
  const [teacherQuizzes, setTeacherQuizzes] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const rootSnap = await getDocs(collection(db, 'userTrees'));
        const rows = await Promise.all(
          rootSnap.docs.map(async (rootDoc) => {
            const data = rootDoc.data();
            if (roleIsTeacher(data)) return null;

            const treesSnap = await getDocs(collection(db, 'userTrees', rootDoc.id, 'trees'));
            const journalSnap = await getDocs(
              query(collection(db, 'userTrees', rootDoc.id, 'journals'), orderBy('updatedAt', 'desc'))
            );

            const trees = treesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            const journals = journalSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

            return {
              userId: rootDoc.id,
              name: data.fullName || data.email || rootDoc.id,
              email: data.email || '-',
              school: data.school || '-',
              className: data.className || '-',
              province: data.province || '-',
              trees,
              journals,
            };
          })
        );

        setStudents(rows.filter(Boolean));
        const postSnap = await getDocs(query(collection(db, 'teacherPosts'), orderBy('createdAt', 'desc')));
        setTeacherPosts(postSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        const quizSnap = await getDocs(query(collection(db, 'teacherQuizzes'), orderBy('createdAt', 'desc')));
        setTeacherQuizzes(quizSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Teacher dashboard load failed', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const summary = useMemo(() => {
    const totalTrees = students.reduce((sum, s) => sum + s.trees.length, 0);
    const totalLogs = students.reduce(
      (sum, s) => sum + s.trees.reduce((treeSum, tree) => treeSum + (tree.logs || []).length, 0),
      0
    );
    const totalJournals = students.reduce((sum, s) => sum + s.journals.length, 0);
    return { totalTrees, totalLogs, totalJournals };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const id = (s.userId || '').toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q);
    });
  }, [studentSearch, students]);

  const exportStudentsExcel = () => {
    const headers = {
      studentName: t('teacher.xlsx.studentName', { defaultValue: 'Сурагчийн нэр' }),
      userId: t('teacher.xlsx.userId', { defaultValue: 'Хэрэглэгчийн ID' }),
      email: t('teacher.xlsx.email', { defaultValue: 'И-мэйл' }),
      school: t('teacher.xlsx.school', { defaultValue: 'Сургууль' }),
      className: t('teacher.xlsx.className', { defaultValue: 'Анги' }),
      province: t('teacher.xlsx.province', { defaultValue: 'Аймаг' }),
      treeCount: t('teacher.xlsx.treeCount', { defaultValue: 'Модны тоо' }),
      treeNames: t('teacher.xlsx.treeNames', { defaultValue: 'Модны нэрс' }),
      totalWaterings: t('teacher.xlsx.totalWaterings', { defaultValue: 'Нийт усалгаа' }),
      totalLogs: t('teacher.xlsx.totalLogs', { defaultValue: 'Нийт бүртгэл' }),
      latestDailyNote: t('teacher.xlsx.latestDailyNote', { defaultValue: 'Сүүлийн өдрийн тэмдэглэл' }),
    };

    const rows = filteredStudents.map((s) => {
      const treeNames = (s.trees || []).map((tree) => tree.name).filter(Boolean).join(', ');
      const latestNote = s.journals?.[0]?.note || '';
      const totalWaterings = (s.trees || []).reduce(
        (sum, tree) => sum + (tree.wateringDates || []).length,
        0
      );
      const totalLogs = (s.trees || []).reduce((sum, tree) => sum + (tree.logs || []).length, 0);

      return {
        [headers.studentName]: s.name || '',
        [headers.userId]: s.userId || '',
        [headers.email]: s.email || '',
        [headers.school]: s.school || '',
        [headers.className]: s.className || '',
        [headers.province]: getProvinceLabelMn(s.province || ''),
        [headers.treeCount]: (s.trees || []).length,
        [headers.treeNames]: treeNames,
        [headers.totalWaterings]: totalWaterings,
        [headers.totalLogs]: totalLogs,
        [headers.latestDailyNote]: latestNote,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      t('teacher.xlsx.sheetName', { defaultValue: 'Сурагчид' })
    );
    XLSX.writeFile(workbook, 'treedoctor-students.xlsx');
  };

  const savePost = async () => {
    if (!postTitle.trim() || !postBody.trim()) return;
    const title = postTitle.trim();
    const body = postBody.trim();

    try {
      if (editingPostId) {
        await updateDoc(doc(db, 'teacherPosts', editingPostId), {
          title,
          body,
          updatedAt: serverTimestamp(),
        });
        setTeacherPosts((prev) =>
          prev.map((p) => (p.id === editingPostId ? { ...p, title, body, updatedAt: new Date() } : p))
        );
        setNewsStatus(t('teacher.newsUpdated', { defaultValue: 'Мэдээ амжилттай шинэчлэгдлээ.' }));
      } else {
        const newPost = await addDoc(collection(db, 'teacherPosts'), {
          title,
          body,
          createdAt: serverTimestamp(),
        });
        setTeacherPosts((prev) => [{ id: newPost.id, title, body, createdAt: new Date() }, ...prev]);
        setNewsStatus(t('teacher.newsPublished', { defaultValue: 'Мэдээ амжилттай нийтлэгдлээ.' }));
      }

      setPostTitle('');
      setPostBody('');
      setEditingPostId(null);
    } catch (e) {
      console.error('Save post failed', e);
      setNewsStatus(t('teacher.newsSaveFail', { defaultValue: 'Мэдээ хадгалах үед алдаа гарлаа.' }));
    }
  };

  const startEditPost = (post) => {
    setPostTitle(post.title || '');
    setPostBody(post.body || '');
    setEditingPostId(post.id);
    setNewsStatus(t('teacher.newsEditing', { defaultValue: 'Засварлах горим идэвхтэй.' }));
    requestAnimationFrame(() => {
      newsFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const cancelEditPost = () => {
    setPostTitle('');
    setPostBody('');
    setEditingPostId(null);
    setNewsStatus(t('teacher.newsEditCancelled', { defaultValue: 'Засварлах горим цуцлагдлаа.' }));
  };

  const removePost = async (postId) => {
    try {
      await deleteDoc(doc(db, 'teacherPosts', postId));
      setTeacherPosts((prev) => prev.filter((p) => p.id !== postId));
      if (editingPostId === postId) cancelEditPost();
      setNewsStatus(t('teacher.newsDeleted', { defaultValue: 'Мэдээ устгагдлаа.' }));
    } catch (e) {
      console.error('Delete post failed', e);
      setNewsStatus(t('teacher.newsDeleteFail', { defaultValue: 'Мэдээ устгах үед алдаа гарлаа.' }));
    }
  };

  const createQuiz = async () => {
    if (!quizQuestion.trim()) return;
    const options = quizOptions
      .map((v) => v.trim())
      .filter(Boolean);
    if (options.length < 2) return;
    const safeCorrectIndex = Math.min(Math.max(Number(quizCorrectIndex) || 0, 0), options.length - 1);
    const newQuiz = await addDoc(collection(db, 'teacherQuizzes'), {
      question: quizQuestion.trim(),
      options,
      correctIndex: safeCorrectIndex,
      createdAt: serverTimestamp(),
    });

    setTeacherQuizzes((prev) => [
      {
        id: newQuiz.id,
        question: quizQuestion.trim(),
        options,
        correctIndex: safeCorrectIndex,
        createdAt: new Date(),
      },
      ...prev,
    ]);

    setQuizQuestion('');
    setQuizOptions(['', '']);
    setQuizCorrectIndex(0);
  };

  const removeQuiz = async (quizId) => {
    try {
      await deleteDoc(doc(db, 'teacherQuizzes', quizId));
      setTeacherQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (e) {
      console.error('Delete quiz failed', e);
    }
  };

  const setOptionAt = (idx, value) => {
    setQuizOptions((prev) => prev.map((opt, i) => (i === idx ? value : opt)));
  };

  const addOptionField = () => {
    setQuizOptions((prev) => [...prev, '']);
  };

  const removeOptionField = (idx) => {
    setQuizOptions((prev) => {
      if (prev.length <= 2) return prev;
      const next = prev.filter((_, i) => i !== idx);
      if (quizCorrectIndex >= next.length) {
        setQuizCorrectIndex(next.length - 1);
      } else if (idx < quizCorrectIndex) {
        setQuizCorrectIndex((p) => Math.max(0, p - 1));
      }
      return next;
    });
  };

  if (loading) {
    return <div className="rounded-xl bg-white p-6 shadow">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {section === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t('teacher.totalStudents')} value={students.length} />
            <StatCard title={t('teacher.totalTrees')} value={summary.totalTrees} />
            <StatCard title={t('teacher.totalLogs')} value={summary.totalLogs} />
            <StatCard title={t('teacher.totalJournals')} value={summary.totalJournals} />
          </div>
        </>
      )}

      {section === 'news' && (
      <div className="ui-card-hero p-4 sm:p-6">
        <div ref={newsFormRef} />
        <h2 className="text-lg font-bold text-green-800 sm:text-xl">{t('teacher.publishNews')}</h2>
        {editingPostId && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            {t('teacher.newsEditingBanner', { defaultValue: 'Та одоо мэдээ засварлаж байна. Дуусаад "Засварыг хадгалах" дарна уу.' })}
          </p>
        )}
        {!!newsStatus && (
          <p className="mt-2 text-xs font-medium text-green-700">{newsStatus}</p>
        )}
        <input
          value={postTitle}
          onChange={(e) => setPostTitle(e.target.value)}
          placeholder={t('teacher.newsTitle')}
          className="mt-3 w-full rounded-lg border border-green-200 p-3 text-sm"
        />
        <textarea
          value={postBody}
          onChange={(e) => setPostBody(e.target.value)}
          placeholder={t('teacher.newsBody')}
          className="mt-3 h-28 w-full rounded-lg border border-green-200 p-3 text-sm"
        />
        <button
          type="button"
          onClick={savePost}
          className="mt-3 min-h-11 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {editingPostId ? t('teacher.updateNews', { defaultValue: 'Засварыг хадгалах' }) : t('teacher.publish')}
        </button>
        {editingPostId && (
          <button
            type="button"
            onClick={cancelEditPost}
            className="ml-2 mt-3 min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            {t('teacher.cancelEdit', { defaultValue: 'Засварыг цуцлах' })}
          </button>
        )}

        <div className="mt-4 rounded-xl border border-green-100 bg-white/80 p-4">
          <h3 className="text-sm font-bold text-green-900">
            {t('teacher.newsListTitle', { defaultValue: 'Нийтэлсэн мэдээнүүд' })}
          </h3>
          <div className="mt-3 space-y-2">
            {teacherPosts.map((post, idx) => (
              <div key={post.id} className="rounded-lg border border-green-100 bg-green-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-green-900">
                      {t('teacher.newsLabel', { defaultValue: 'Мэдээ' })} {idx + 1}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-800">{post.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{post.body}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditPost(post)}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                    >
                      {t('teacher.editNews', { defaultValue: 'Засах' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePost(post.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      {t('teacher.deleteNews', { defaultValue: 'Устгах' })}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {teacherPosts.length === 0 && (
              <p className="text-xs text-slate-500">
                {t('teacher.noNewsYet', { defaultValue: 'Одоогоор мэдээ нийтлээгүй байна.' })}
              </p>
            )}
          </div>
        </div>
      </div>
      )}

      {section === 'quiz' && (
      <div className="ui-card-hero p-4 sm:p-6">
        <h2 className="text-lg font-bold text-blue-800 sm:text-xl">{t('teacher.publishQuiz')}</h2>
        <div className="mt-3 rounded-xl border border-blue-100 bg-white/80 p-4">
          <input
            value={quizQuestion}
            onChange={(e) => setQuizQuestion(e.target.value)}
            placeholder={t('teacher.quizQuestion')}
            className="w-full rounded-lg border border-blue-200 p-3 text-sm"
          />

          <div className="mt-3 space-y-2">
            {quizOptions.map((opt, idx) => (
              <div key={`option-${idx}`} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm font-semibold text-blue-700">{idx + 1}.</span>
                <input
                  value={opt}
                  onChange={(e) => setOptionAt(idx, e.target.value)}
                  placeholder={`${t('teacher.quizOptionLabel', { defaultValue: 'Хариулт' })} ${idx + 1}`}
                  className="flex-1 rounded-lg border border-blue-200 p-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeOptionField(idx)}
                  disabled={quizOptions.length <= 2}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-40"
                >
                  {t('teacher.removeOption', { defaultValue: 'Устгах' })}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOptionField}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
            >
              {t('teacher.addOption', { defaultValue: '+ Хариулт нэмэх' })}
            </button>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm text-slate-700">
              {t('teacher.quizCorrectOption', { defaultValue: 'Зөв хариулт' })}
            </label>
            <select
              value={quizCorrectIndex}
              onChange={(e) => setQuizCorrectIndex(Number(e.target.value))}
              className="w-full rounded-lg border border-blue-200 p-3 text-sm"
            >
              {quizOptions.map((_, idx) => (
                <option key={`correct-${idx}`} value={idx}>
                  {t('teacher.correctOptionPrefix', { defaultValue: 'Хариулт' })} {idx + 1}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={createQuiz}
            className="mt-3 min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {t('teacher.publish')}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-white/80 p-4">
          <h3 className="text-sm font-bold text-blue-900">
            {t('teacher.quizListTitle', { defaultValue: 'Нийтэлсэн сорилууд' })}
          </h3>
          <div className="mt-3 space-y-2">
            {teacherQuizzes.map((q, idx) => (
              <div key={q.id} className="flex items-start justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    {t('teacher.quizLabel', { defaultValue: 'Сорил' })} {idx + 1}
                  </p>
                  <p className="text-sm text-slate-700">{q.question}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuiz(q.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                >
                  {t('teacher.deleteQuiz', { defaultValue: 'Устгах' })}
                </button>
              </div>
            ))}
            {teacherQuizzes.length === 0 && (
              <p className="text-xs text-slate-500">{t('teacher.noQuizYet', { defaultValue: 'Одоогоор сорил үүсгээгүй байна.' })}</p>
            )}
          </div>
        </div>
      </div>
      )}

      {section === 'students' && (
      <div className="ui-card-hero p-4 sm:p-6">
        <h2 className="text-xl font-bold text-green-800">{t('teacher.studentAnalytics')}</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder={t('teacher.searchStudents', { defaultValue: 'Search by name, user ID, or email' })}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm sm:flex-1"
          />
          <button
            type="button"
            onClick={exportStudentsExcel}
            className="ui-action whitespace-nowrap px-4 py-2 text-sm"
          >
            {t('teacher.exportExcel', { defaultValue: 'Download Excel' })}
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {filteredStudents.map((s) => (
            <div key={s.userId} className="rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Info label={t('teacher.studentName')} value={s.name} />
                <Info label={t('teacher.school')} value={s.school} />
                <Info label={t('teacher.class')} value={s.className} />
                <Info label={t('teacher.province')} value={getProvinceLabelMn(s.province)} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {s.trees.map((tree) => (
                  <div key={tree.id} className="rounded-lg bg-green-50 p-3">
                    {tree.pictures?.[0] ? (
                      <img src={tree.pictures[0]} alt={tree.name || 'tree'} className="mb-2 h-28 w-full rounded-md object-cover" />
                    ) : (
                      <div className="mb-2 flex h-28 w-full items-center justify-center rounded-md bg-green-100 text-xs text-green-700">
                        {t('teacher.noPhoto')}
                      </div>
                    )}
                    <p className="font-semibold text-green-800">{tree.name || '-'}</p>
                    <p className="text-xs text-gray-600">{t('teacher.type')}: {tree.treeType || '-'}</p>
                    <p className="text-xs text-gray-600">{t('teacher.logs')}: {(tree.logs || []).length}</p>
                    <p className="text-xs text-gray-600">{t('teacher.waters')}: {(tree.wateringDates || []).length}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg bg-yellow-50 p-3">
                <p className="text-sm font-semibold text-yellow-800">{t('teacher.latestNote')}</p>
                <p className="mt-1 text-sm text-gray-700">{s.journals[0]?.note || t('teacher.noNotes')}</p>
              </div>
            </div>
          ))}
          {filteredStudents.length === 0 && <p className="text-sm text-gray-500">{t('teacher.noStudents')}</p>}
        </div>
      </div>
      )}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-lg">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="mt-1 text-2xl font-bold text-green-800">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}
