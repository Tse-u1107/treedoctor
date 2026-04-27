import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTree,
  faChartLine,
  faCalendarWeek,
  faSeedling,
  faDroplet,
  faRuler,
  faMedal,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { collection, getDocs } from '@firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useTab } from '../../context/TabContext';
import { badgeCategories } from '../../config/badges';
import { getLevelInfo, xpProgress, getUserXpDoc } from '../../utils/xpUtils';
import CertificateModal from '../../components/CertificateModal';

const formatDateKey = (date) => {
  const d = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
};

const getWeekRange = (date) => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
};

const formatGrowthData = (trees) => {
  const allDates = new Set();
  trees.forEach((tree) => {
    (tree.logs || []).forEach((log) => {
      if (log.height || log.diameter) allDates.add(log.date.seconds * 1000);
    });
  });

  return Array.from(allDates)
    .sort()
    .map((timestamp) => {
      const point = { date: new Date(timestamp).toLocaleDateString() };
      trees.forEach((tree, idx) => {
        const treeName = tree.name || `Tree ${idx + 1}`;
        const log = tree.logs?.find((l) => l.date.seconds * 1000 === timestamp);
        if (log?.height) point[`${treeName} (Height)`] = log.height;
      });
      return point;
    });
};

const palette = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b'];

const Dashboard = () => {
  const { t } = useTranslation();
  const { setActiveTab } = useTab();
  const { user } = useAuth();

  const [trees, setTrees] = useState([]);
  const [events, setEvents] = useState({});
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [xpTotal, setXpTotal] = useState(0);
  const [certOpen, setCertOpen] = useState(false);
  const [focusSection, setFocusSection] = useState('trees');
  const [currentDate] = useState(new Date());

  const daysOfWeek = useMemo(
    () => t('dashboard.days', { returnObjects: true }) || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    [t]
  );

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const uid = `${user.uid.slice(0, 5)}${user.uid.slice(-5)}`;
      try {
        const [treeSnap, badgeSnap, xpDoc] = await Promise.all([
          getDocs(collection(db, 'userTrees', uid, 'trees')),
          getDocs(collection(db, 'userTrees', uid, 'badges')),
          getUserXpDoc(uid),
        ]);

        const treeList = treeSnap.docs.map((d) => ({ id: d.id, ...d.data(), date: d.data().date?.toDate?.() || d.data().date }));
        setTrees(treeList);
        setEarnedBadges(badgeSnap.docs.map((d) => d.id));
        setXpTotal(Number(xpDoc.xp) || 0);

        const processedEvents = {};
        treeList.forEach((tree) => {
          if (tree.date) {
            const planted = formatDateKey(tree.date);
            processedEvents[planted] = [...(processedEvents[planted] || []), { type: 'plant', tree: tree.name }];
          }

          (tree.wateringDates || []).forEach((waterDate) => {
            const key = formatDateKey(waterDate);
            processedEvents[key] = [...(processedEvents[key] || []), { type: 'water', tree: tree.name }];
          });

          (tree.logs || []).forEach((log) => {
            if (!log.date) return;
            const key = formatDateKey(log.date);
            processedEvents[key] = [...(processedEvents[key] || []), { type: 'measure', tree: tree.name, ...log }];
          });
        });

        setEvents(processedEvents);
      } catch (e) {
        console.error('Dashboard load failed', e);
      }
    };

    load();
  }, [user]);

  const recentBadges = useMemo(() => {
    const all = [];
    Object.values(badgeCategories).forEach((c) => {
      c.badges.forEach((b) => {
        if (earnedBadges.includes(b.id)) all.push({ ...b, category: c.title });
      });
    });
    return all.slice(-6).reverse();
  }, [earnedBadges]);

  const stats = useMemo(() => {
    if (!trees.length) return { survivalPct: null, logCount: 0 };
    const alive = trees.filter((tree) => {
      const logs = [...(tree.logs || [])].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      return logs[0]?.status !== 'dead';
    }).length;
    const logCount = trees.reduce((s, tr) => s + (tr.logs?.length || 0), 0);
    return { survivalPct: Math.round((alive / trees.length) * 100), logCount };
  }, [trees]);

  const levelInfo = getLevelInfo(xpTotal);
  const prog = xpProgress(xpTotal);
  const growthData = formatGrowthData(trees);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay() + i);
    return start;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <CertificateModal open={certOpen} onClose={() => setCertOpen(false)} displayName={user?.displayName || user?.email || ''} />

      <section className="ui-card-hero p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="ui-title">{t('dashboard.title')}</h1>
            <p className="ui-subtitle mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="rounded-2xl bg-[#0f172a] px-4 py-3 text-white shadow">
            <p className="text-[11px] uppercase tracking-wide text-slate-300">XP</p>
            <p className="text-2xl font-semibold">{xpTotal}</p>
            {levelInfo.nextAt != null && <p className="text-xs text-slate-300">{prog.remaining} XP left</p>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard color="from-emerald-500 to-green-600" label={t('dashboard.survivalTitle')} value={stats.survivalPct != null ? `${stats.survivalPct}%` : '—'} />
          <StatCard color="from-sky-500 to-cyan-600" label={t('dashboard.treesTitle')} value={String(trees.length)} />
          <StatCard color="from-violet-500 to-purple-600" label={t('dashboard.growthTitle')} value={String(stats.logCount)} />
        </div>

        {xpTotal >= 5000 && (
          <button type="button" className="ui-action mt-4 w-full py-2.5 text-sm" onClick={() => setCertOpen(true)}>
            {t('dashboard.openCertificate')}
          </button>
        )}
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'trees', label: t('dashboard.myTrees') },
          { id: 'growth', label: t('dashboard.growth') },
          { id: 'calendar', label: t('dashboard.weeklyCal') },
          { id: 'badges', label: t('dashboard.recentBadges') },
        ].map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setFocusSection(section.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
              focusSection === section.id ? 'bg-emerald-600 text-white' : 'bg-white/80 text-slate-700'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {focusSection === 'trees' && (
        <section className="ui-card-hero p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faTree} className="text-emerald-700" />
            <h2 className="text-lg font-semibold text-emerald-900">{t('dashboard.myTrees')}</h2>
          </div>

          {trees.length === 0 ? (
            <EmptyBlock icon={faSeedling} text={t('dashboard.plantFirstTree')} onAction={() => setActiveTab('tree')} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {trees.slice(0, 4).map((tree) => {
                const latestLog = tree.logs?.[tree.logs.length - 1];
                const cover = latestLog?.picture || tree.pictures?.[0];
                return (
                  <article key={tree.id} className="overflow-hidden rounded-2xl border border-white/40 bg-white/80">
                    {cover ? (
                      <img src={cover} alt={tree.name} className="h-32 w-full object-cover sm:h-36" />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-emerald-50 text-emerald-500 sm:h-36">
                        <FontAwesomeIcon icon={faSeedling} className="text-2xl" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-semibold text-emerald-900">{tree.name || t('dashboard.myTree')}</p>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <p className="flex items-center gap-1"><FontAwesomeIcon icon={faClock} /> {t('dashboard.planted')}: {tree.date ? new Date(tree.date).toLocaleDateString() : '-'}</p>
                        <p className="flex items-center gap-1"><FontAwesomeIcon icon={faRuler} /> {t('dashboard.height')}: {latestLog?.height || 0} cm</p>
                        <p className="flex items-center gap-1"><FontAwesomeIcon icon={faDroplet} /> {t('dashboard.wateredTimes', { count: (tree.wateringDates || []).length })}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {focusSection === 'growth' && (
        <section className="ui-card-hero p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faChartLine} className="text-indigo-700" />
            <h2 className="text-lg font-semibold text-indigo-900">{t('dashboard.growth')}</h2>
          </div>

          {growthData.length === 0 ? (
            <EmptyText text={t('dashboard.plantFirst')} />
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={36} />
                  <Tooltip />
                  {trees.map((tree, i) => (
                    <Line
                      key={`${tree.id}-h`}
                      type="monotone"
                      dataKey={`${tree.name || `Tree ${i + 1}`} (Height)`}
                      stroke={palette[i % palette.length]}
                      strokeWidth={2.4}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {focusSection === 'calendar' && (
        <section className="ui-card-hero p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarWeek} className="text-fuchsia-700" />
              <h2 className="text-lg font-semibold text-fuchsia-900">{t('dashboard.weeklyCal')}</h2>
            </div>
            <span className="ui-pill">
              {getWeekRange(currentDate).start} - {getWeekRange(currentDate).end}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((date) => {
              const key = formatDateKey(date);
              const isToday = formatDateKey(new Date()) === key;
              const dayEvents = events[key] || [];
              return (
                <div key={key} className={`rounded-xl p-2 ${isToday ? 'bg-fuchsia-100' : 'bg-white/80'}`}>
                  <p className="text-[10px] text-slate-500">{daysOfWeek[date.getDay()]}</p>
                  <p className="text-sm font-semibold text-slate-800">{date.getDate()}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <span key={idx} className={`h-2 w-2 rounded-full ${e.type === 'water' ? 'bg-sky-500' : e.type === 'measure' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {focusSection === 'badges' && (
        <section className="ui-card-hero p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faMedal} className="text-amber-600" />
              <h2 className="text-lg font-semibold text-amber-800">{t('dashboard.recentBadges')}</h2>
            </div>
            <button type="button" className="ui-action-secondary px-3 text-xs" onClick={() => setActiveTab('badges')}>
              {t('dashboard.viewAll', { count: earnedBadges.length })}
            </button>
          </div>

          {recentBadges.length === 0 ? (
            <EmptyText text={t('dashboard.badgesEmpty')} />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recentBadges.map((badge) => (
                <article key={badge.id} className="rounded-2xl border border-white/40 bg-white/80 p-3">
                  <FontAwesomeIcon icon={badge.icon} className="text-xl text-amber-600" />
                  <p className="mt-2 font-semibold text-slate-800">
                    {t(`badges.items.${badge.id}.name`, { defaultValue: badge.name })}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {t(`badges.items.${badge.id}.desc`, { defaultValue: badge.description })}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

function StatCard({ color, label, value }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${color} px-3 py-3 text-white`}> 
      <p className="text-[11px] uppercase tracking-wide text-white/80">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function EmptyBlock({ icon, text, onAction }) {
  return (
    <div className="rounded-2xl bg-white/75 p-6 text-center">
      <FontAwesomeIcon icon={icon} className="text-2xl text-emerald-600" />
      <p className="mt-3 text-sm text-slate-600">{text}</p>
      <button type="button" className="ui-action mt-4 px-4 py-2 text-sm" onClick={onAction}>
        {text}
      </button>
    </div>
  );
}

function EmptyText({ text }) {
  return <p className="rounded-xl bg-white/75 px-4 py-8 text-center text-sm text-slate-600">{text}</p>;
}

export default Dashboard;
