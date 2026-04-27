import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Transition } from '@headlessui/react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import {
  HiOutlineHome,
  HiOutlineCalendarDays,
  HiOutlineNewspaper,
  HiOutlineDocumentText,
  HiOutlineTrophy,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineClipboardDocumentList,
} from 'react-icons/hi2';
import { IoLeafOutline } from 'react-icons/io5';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import TreeList from '../myTree/TreeList';
import Badges from '../myBadges/badges';
import Calendar from '../myCalendar/calendar';
import Dashboard from './Dashboard';
import EcoLesson from './EcoLesson';
import { useAuth } from '../../context/AuthContext';
import { useTab } from '../../context/TabContext';
import logo from '../../assets/logo.png';
import { clearSession } from '../../utils/sessionUtils';
import StudentJournal from './components/StudentJournal';
import StudentUpdates from './components/StudentUpdates';
import TeacherDashboard from '../teacher/TeacherDashboard';
import ProvinceCoverage from '../../components/ProvinceCoverage';
import { MONGOLIA_PROVINCES, getProvinceLabelMn } from '../../constants/provinces';
import { db } from '../../../firebase';

const Home = () => {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useTab();
  const [role, setRole] = useState('student');
  const [profileDocId, setProfileDocId] = useState('');
  const [profilePromptOpen, setProfilePromptOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    school: '',
    className: '',
    province: '',
    role: 'student',
  });
  const { user } = useAuth();
  const auth = getAuth();

  useEffect(() => {
    const loadRole = async () => {
      if (!user?.uid) return;
      try {
        const id = `${user.uid.slice(0, 5)}${user.uid.slice(-5)}`;
        setProfileDocId(id);
        const snap = await getDoc(doc(db, 'userTrees', id));
        const data = snap.data() || {};
        const foundRole = (data.role || 'student').toLowerCase();
        setRole(foundRole);
        setActiveTab(foundRole === 'teacher' ? 'teacher-overview' : 'dashboard');

        const nextForm = {
          fullName: data.fullName || '',
          school: data.school || '',
          className: data.className || '',
          province: data.province || '',
          role: (data.role || 'student').toLowerCase(),
        };
        setProfileForm(nextForm);

        const requiredMissing = !nextForm.fullName || !nextForm.school || !nextForm.className || !nextForm.province;
        setProfilePromptOpen(requiredMissing);
      } catch (e) {
        console.error('Load role failed', e);
      }
    };
    loadRole();
  }, [setActiveTab, user]);

  const saveProfileCompletion = async () => {
    if (!user?.uid || !profileDocId) return;
    if (!profileForm.fullName || !profileForm.school || !profileForm.className || !profileForm.province) return;

    setProfileSaving(true);
    try {
      const ref = doc(db, 'userTrees', profileDocId);
      const payload = {
        uid: user.uid,
        email: user.email || '',
        fullName: profileForm.fullName.trim(),
        school: profileForm.school.trim(),
        className: profileForm.className.trim(),
        province: profileForm.province,
        role: profileForm.role || 'student',
      };

      const snap = await getDoc(ref);
      if (snap.exists()) await updateDoc(ref, payload);
      else await setDoc(ref, payload, { merge: true });

      setRole((profileForm.role || 'student').toLowerCase());
      setProfilePromptOpen(false);
    } catch (e) {
      console.error('Save profile completion failed', e);
    } finally {
      setProfileSaving(false);
    }
  };

  const navTabs = useMemo(() => {
    if (role === 'teacher') {
      return [
        { id: 'teacher-overview', name: t('teacher.tabOverview', { defaultValue: 'Хураангуй' }), icon: HiOutlineHome },
        { id: 'teacher-students', name: t('teacher.tabStudents', { defaultValue: 'Сурагчид' }), icon: HiOutlineUserGroup },
        { id: 'teacher-news', name: t('teacher.tabNews', { defaultValue: 'Мэдээ' }), icon: HiOutlineNewspaper },
        { id: 'teacher-quiz', name: t('teacher.tabQuiz', { defaultValue: 'Сорил' }), icon: HiOutlineClipboardDocumentList },
      ];
    }

    return [
      { id: 'dashboard', name: t('nav.dashboard'), icon: HiOutlineHome },
      { id: 'tree', name: t('nav.trees'), icon: IoLeafOutline },
      { id: 'calendar', name: t('nav.calendar'), icon: HiOutlineCalendarDays },
      { id: 'updates', name: t('nav.updates'), icon: HiOutlineNewspaper },
      { id: 'journal', name: t('nav.journal'), icon: HiOutlineDocumentText },
      { id: 'badges', name: t('nav.badges'), icon: HiOutlineTrophy },
      { id: 'lesson', name: t('nav.lesson'), icon: HiOutlineAcademicCap },
    ];
  }, [role, t]);

  const primaryMobileTabs = useMemo(() => (role === 'teacher' ? navTabs : navTabs.slice(0, 4)), [navTabs, role]);
  const secondaryTabs = useMemo(() => (role === 'teacher' ? [] : navTabs.slice(4)), [navTabs, role]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      clearSession();
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const renderContent = () => {
    if (role === 'teacher') {
      if (activeTab === 'teacher-students') return <TeacherDashboard section="students" />;
      if (activeTab === 'teacher-news') return <TeacherDashboard section="news" />;
      if (activeTab === 'teacher-quiz') return <TeacherDashboard section="quiz" />;
      return <TeacherDashboard section="overview" />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'tree':
        return <TreeList userId={`${user.uid.slice(0, 5)}${user.uid.slice(-5)}`} />;
      case 'badges':
        return <Badges />;
      case 'calendar':
        return <Calendar />;
      case 'lesson':
        return <EcoLesson />;
      case 'journal':
        return <StudentJournal />;
      case 'updates':
        return <StudentUpdates />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-page pb-[calc(78px+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40">
        <div className="app-shell pb-1 pt-2">
          <div className="td-glass rounded-2xl px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <img src={logo} alt="TreeDoctor Logo" className="h-8 w-8 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-emerald-900">TreeDoctor</p>
                  <p className="truncate text-xs text-slate-500">
                    {role === 'teacher' ? t('nav.teacherDashboard') : t('nav.dashboard')}
                  </p>
                </div>
              </div>

              <Menu as="div" className="relative">
                <Menu.Button className="rounded-full p-1.5 hover:bg-slate-100/70">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="h-8 w-8 rounded-full" />
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-emerald-700" />
                  )}
                </Menu.Button>

                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white/95 py-1 shadow-lg backdrop-blur">
                    <div className="px-3 py-2 text-xs text-slate-500">{user?.email}</div>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`${active ? 'bg-slate-100' : ''} block w-full px-4 py-2 text-left text-sm text-slate-700`}
                        >
                          {t('common.signOut')}
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>

            <div className="mt-2 hidden gap-2 overflow-x-auto md:flex">
              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-white/80 text-slate-700 hover:bg-white'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="app-shell py-2 sm:py-3">
        {activeTab === 'teacher-overview' && (
          <div className="mb-3">
            <ProvinceCoverage />
          </div>
        )}

        {secondaryTabs.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {secondaryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  activeTab === tab.id ? 'bg-[#4f46e5] text-white' : 'bg-white/85 text-slate-700'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        )}
        {renderContent()}
        {activeTab === 'dashboard' && (
          <div className="mt-4">
            <ProvinceCoverage />
          </div>
        )}
      </main>

      {profilePromptOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <h3 className="text-lg font-bold text-slate-900">
              {t('profilePrompt.title', { defaultValue: 'Профайлаа бүрэн бөглөнө үү' })}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t('profilePrompt.subtitle', { defaultValue: 'Үргэлжлүүлэхийн тулд дараах мэдээллийг заавал бөглөнө үү.' })}
            </p>

            <div className="mt-4 space-y-3">
              <input
                value={profileForm.fullName}
                onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder={t('auth.fullName')}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              />
              <input
                value={profileForm.school}
                onChange={(e) => setProfileForm((p) => ({ ...p, school: e.target.value }))}
                placeholder={t('auth.school')}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              />
              <input
                value={profileForm.className}
                onChange={(e) => setProfileForm((p) => ({ ...p, className: e.target.value }))}
                placeholder={t('auth.className')}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              />
              <select
                value={profileForm.province}
                onChange={(e) => setProfileForm((p) => ({ ...p, province: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              >
                <option value="">{t('auth.selectProvince')}</option>
                {MONGOLIA_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {getProvinceLabelMn(province)}
                  </option>
                ))}
              </select>
              <select
                value={profileForm.role}
                onChange={(e) => setProfileForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              >
                <option value="student">{t('auth.roleStudent')}</option>
                <option value="teacher">{t('auth.roleTeacher')}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={saveProfileCompletion}
              disabled={
                profileSaving ||
                !profileForm.fullName.trim() ||
                !profileForm.school.trim() ||
                !profileForm.className.trim() ||
                !profileForm.province
              }
              className="mt-4 min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {profileSaving
                ? t('profilePrompt.saving', { defaultValue: 'Хадгалж байна...' })
                : t('profilePrompt.save', { defaultValue: 'Хадгалаад үргэлжлүүлэх' })}
            </button>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 p-2 md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-1 rounded-2xl border border-white/50 bg-white/88 p-1 shadow-lg backdrop-blur">
          {primaryMobileTabs.map((tab) => {
            const Icon = tab.icon;
            return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-11 flex-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-emerald-600 text-white' : 'text-slate-700'
              }`}
            >
              <div className="flex flex-col items-center gap-0.5">
                {Icon && <Icon className="text-base leading-none opacity-90" />}
                <span className="leading-none">{tab.name}</span>
              </div>
            </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Home;
