import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSeedling, 
    faChartLine, 
    faMedal,
    faTree,
    faRuler,
    faDroplet,
    faClock,
    faCalendarWeek,
    faCalendar
} from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { collection, getDocs } from '@firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { badgeCategories } from '../../config/badges';
import { useTab } from '../../context/TabContext';
import { Navigation } from 'swiper/modules';
import {
  getLevelInfo,
  xpProgress,
  getUserXpDoc,
} from '../../utils/xpUtils';
import CertificateModal from '../../components/CertificateModal';

const MOCK_TREES = [
    {
        id: 'preview-1',
        name: 'Cherry Blossom',
        treeType: 'Sakura',
        date: new Date('2025-01-15'),
        picture: null,
        heights: {
            '2025-01-15': 10,
            '2025-02-15': 15,
            '2025-03-15': 25,
            '2025-04-15': 35,
            '2025-05-15': 45
        },
        wateringDates: Array(12).fill(null)
    },
    {
        id: 'preview-2',
        name: 'Mighty Oak',
        treeType: 'Oak',
        date: new Date('2025-02-01'),
        picture: null,
        heights: {
            '2025-02-01': 8,
            '2025-03-01': 12,
            '2025-04-01': 20,
            '2025-05-01': 30,
            '2025-06-01': 40
        },
        wateringDates: Array(8).fill(null)
    }
];

/** Preview / landing: MOCK_TREES use `heights` by date key, not Firestore `logs`. */
const formatMockTreesChartData = (mockTrees) => {
    const dateKeys = new Set();
    mockTrees.forEach((tree) => {
        Object.keys(tree.heights || {}).forEach((k) => dateKeys.add(k));
    });
    return Array.from(dateKeys)
        .sort()
        .map((dateKey) => {
            const row = {
                date: new Date(`${dateKey}T12:00:00`).toLocaleDateString(),
            };
            mockTrees.forEach((tree, index) => {
                const name = tree.name || `Tree ${index + 1}`;
                const h = tree.heights?.[dateKey];
                if (h != null) row[name] = h;
            });
            return row;
        });
};

const formatDateKey = (date) => {
    // Ensure we handle both Date objects and Firebase timestamps
    const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    
    // Use local timezone for consistent date representation
    return new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate()
    ).toISOString().split('T')[0];
};

// Add this helper function at the top level
const getWeekRange = (date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
        start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
};

const Dashboard = ({ isPreview = false }) => {
    const { t } = useTranslation();
    const daysOfWeek = useMemo(
        () => t('dashboard.days', { returnObjects: true }) || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        [t]
    );

    const { setActiveTab } = useTab()
    const { user } = useAuth();
    const [trees, setTrees] = useState([]);
    const [earnedBadges, setEarnedBadges] = useState([]);
    const [events, setEvents] = useState({});
    const [xpTotal, setXpTotal] = useState(0);
    const [certOpen, setCertOpen] = useState(false);

    useEffect(() => {
        if (!user || isPreview) return;
        const uid = `${user.uid.slice(0, 5)}${user.uid.slice(-5)}`;
        (async () => {
            try {
                const docSnap = await getUserXpDoc(uid);
                setXpTotal(Number(docSnap.xp) || 0);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [user, isPreview]);

    // Modified fetchTrees function to match TreeList's data structure
    const fetchTrees = async () => {
        try {
            const treesRef = collection(db, 'userTrees', `${user.uid.slice(0,5)}${user.uid.slice(-5)}`, 'trees');
            const querySnapshot = await getDocs(treesRef);

            const treesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convert Firestore timestamp to Date
                date: doc.data().date?.toDate(),
                lastWatered: doc.data().lastWatered?.toDate()
            }));
            setTrees(treesList);
        } catch (error) {
            console.error('Error fetching trees:', error);
        }
    };
    const [currentDate] = useState(new Date());

    const generateWeekData = (baseDate) => {
        const startOfWeek = new Date(baseDate);
        startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());
        
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            return date;
        });
    };

    useEffect(() => {
        const fetchEvents = async () => {
            if (!user) return;
            
            try {
                const processedEvents = {};
                const treesRef = collection(db, 'userTrees', `${user.uid.slice(0,5)}${user.uid.slice(-5)}`, 'trees');
                const treesSnapshot = await getDocs(treesRef);

                treesSnapshot.forEach((doc) => {
                    const tree = doc.data();

                    // Process planting date
                    if (tree.date) {
                        const plantedDate = formatDateKey(tree.date);
                        processedEvents[plantedDate] = [
                            ...(processedEvents[plantedDate] || []),
                            { type: 'plant', tree: tree.name }
                        ];
                    }

                    // Process watering dates
                    if (tree.wateringDates) {
                        tree.wateringDates.forEach(waterDate => {
                            const date = formatDateKey(waterDate);
                            processedEvents[date] = [
                                ...(processedEvents[date] || []),
                                { type: 'water', tree: tree.name }
                            ];
                        });
                    }

                    // Process logs with measurements
                    if (tree.logs) {
                        tree.logs.forEach(log => {
                            if (log.date) {
                                const date = formatDateKey(log.date);
                                processedEvents[date] = [
                                    ...(processedEvents[date] || []),
                                    { 
                                        type: 'measure', 
                                        tree: tree.name,
                                        height: log.height,
                                        diameter: log.diameter,
                                        status: log.status
                                    }
                                ];
                            }
                        });
                    }
                });

                setEvents(processedEvents);
            } catch (error) {
                console.error('Error fetching calendar events:', error);
            }
        };

        fetchEvents();
    }, [user]);



    useEffect(() => {
        fetchTrees();
    }, [user]);

    // Add new useEffect for fetching badges
    useEffect(() => {
        const fetchBadges = async () => {
            if (!user) return;
            
            try {
                const userCollectionId = `${user.uid.slice(0,5)}${user.uid.slice(-5)}`;
                const badgesRef = collection(db, 'userTrees', userCollectionId, 'badges');
                const snapshot = await getDocs(badgesRef);
                
                const badges = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setEarnedBadges(badges.map(badge => badge.id));
            } catch (error) {
                console.error('Error fetching badges:', error);
            }
        };

        fetchBadges();
    }, [user]);

    // Add these helper functions after the existing ones

    const getMostRecentPicture = (tree) => {
      // Check logs first
      const logsWithPictures = (tree.logs || [])
        .filter(log => log.picture)
        .sort((a, b) => b.date - a.date);
      
      if (logsWithPictures.length > 0) {
        return logsWithPictures[0].picture;
      }
      
      // If no log pictures, return the first initial picture
      return tree.pictures?.[0] || null;
    };

    // Add function to get most recent measurements
    const getMostRecentMeasurements = (tree) => {
        // Check logs first for both measurements
        const logsWithMeasurements = (tree.logs || [])
            .filter(log => log.height && log.diameter)
            .sort((a, b) => b.date - a.date);
        
        if (logsWithMeasurements.length > 0) {
            return {
                height: logsWithMeasurements[0].height,
                diameter: logsWithMeasurements[0].diameter,
                date: logsWithMeasurements[0].date,
                lastLog: new Date(logsWithMeasurements[logsWithMeasurements.length-1].date.seconds * 1000).toLocaleDateString(),
            };
        }
        
        // If no log measurements, return the initial measurements
        return {
            height: Object.values(tree.heights || {})[0] || 0,
            diameter: Object.values(tree.diameters || {})[0] || 0,
            date: tree.date,
            lastLog: 'Not available'
        };
    };

// Update formatGrowthData to handle both height and diameter
const formatGrowthData = (trees) => {
    const allDates = new Set();
    
    // Collect all dates from logs
    trees.forEach(tree => {
        if (tree.logs) {
            tree.logs.forEach(log => {
                if (log.height || log.diameter) {
                    allDates.add(log.date.seconds * 1000);
                }
            });
        }
    });

    // Convert to sorted array
    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map(timestamp => {
        const date = new Date(timestamp);
        const dataPoint = {
            date: date.toLocaleDateString()
        };

        trees.forEach((tree) => {
            const treeName = tree.name || 'Unknown Tree';
            const log = tree.logs?.find(l => l.date.seconds * 1000 === timestamp);
            
            if (log) {
                if (log.height) dataPoint[`${treeName} (Height)`] = log.height;
                if (log.diameter) dataPoint[`${treeName} (Diameter)`] = log.diameter;
            }
        });

        return dataPoint;
    });
};

    // Get recent badges (last 4 earned)
    const getRecentBadges = () => {
        const allBadges = [];
        Object.values(badgeCategories).forEach(category => {
            category.badges.forEach(badge => {
                if (earnedBadges.includes(badge.id)) {
                    allBadges.push({
                        ...badge,
                        category: category.title
                    });
                }
            });
        });
        
        // Return most recent 4 badges
        return allBadges.slice(-4);
    };

    // Replace the hardcoded badges array with getRecentBadges()
    const recentBadges = getRecentBadges();

    const programStats = useMemo(() => {
        if (!trees.length) return { survivalPct: null, logCount: 0 };
        const alive = trees.filter((tree) => {
            const logs = [...(tree.logs || [])].sort(
                (a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)
            );
            const st = logs[0]?.status;
            return st !== 'dead';
        }).length;
        const logCount = trees.reduce((s, tr) => s + (tr.logs?.length || 0), 0);
        return { survivalPct: Math.round((alive / trees.length) * 100), logCount };
    }, [trees]);

    // Skip data fetching if in preview mode
    if (isPreview) {
        const previewGrowthData = formatMockTreesChartData(MOCK_TREES);
        return (
            <div className="">
                {/* Trees List Section */}
                <div className="mb-6 rounded-xl bg-white p-4 shadow-lg sm:p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <FontAwesomeIcon icon={faTree} className="text-2xl text-green-800" />
                        <h2 className="text-xl font-bold text-green-800 sm:text-2xl">{t('dashboard.myTrees')}</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {MOCK_TREES.map(tree => (
                            <div key={tree.id} className="rounded-lg bg-white p-4 shadow">
                                {tree.picture ? (
                                    <img 
                                        src={tree.picture}
                                        alt={tree.name}
                                        className="mb-3 h-40 w-full rounded-lg object-cover sm:h-48"
                                    />
                                ) : (
                                    <div className="mb-3 flex h-40 w-full items-center justify-center rounded-lg bg-green-100 sm:h-48">
                                        <FontAwesomeIcon icon={faSeedling} className="text-4xl text-green-400" />
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-green-700 sm:text-xl">{tree.name || t('dashboard.myTree')}</h3>
                                <div className="mt-2 space-y-2">
                                    <p className="flex items-center gap-2 text-sm sm:text-base">
                                        <FontAwesomeIcon icon={faTree} className="text-green-600" />
                                        <span>{t('dashboard.type')}: {tree.treeType || t('dashboard.unknownType')}</span>
                                    </p>
                                    <p className="flex items-center gap-2 text-sm sm:text-base">
                                        <FontAwesomeIcon icon={faClock} className="text-green-600" />
                                        <span>{t('dashboard.planted')}: {tree.date ? tree.date.toLocaleDateString() : t('dashboard.recently')}</span>
                                    </p>
                                    <p className="flex items-center gap-2 text-sm sm:text-base">
                                        <FontAwesomeIcon icon={faRuler} className="text-green-600" />
                                        <span>{t('dashboard.height')}: {Object.values(tree.heights || {}).pop() || 0} cm</span>
                                    </p>
                                    <p className="flex items-center gap-2 text-sm sm:text-base">
                                        <FontAwesomeIcon icon={faDroplet} className="text-green-600" />
                                        <span>{t('dashboard.wateredTimes', { count: (tree.wateringDates || []).length })}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Growth Chart Section - Now in full width */}
                <div className="mb-6 rounded-xl bg-white p-4 shadow-lg sm:p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <FontAwesomeIcon icon={faChartLine} className="text-2xl text-green-800" />
                        <h2 className="text-xl font-bold text-green-800 sm:text-2xl">{t('dashboard.growth')}</h2>
                    </div>
                    <div className="h-[min(320px,55vw)] w-full min-h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                            data={previewGrowthData}
                            margin={{ top: 5, right: 8, bottom: 5, left: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis label={{ value: t('dashboard.chartHeightY'), angle: -90, position: 'insideLeft' }} width={48} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            {MOCK_TREES.map((tree, index) => (
                                <Line 
                                    key={tree.id}
                                    type="monotone" 
                                    dataKey={tree.name || `Tree ${index + 1}`}
                                    stroke={`hsl(${(index * 137.5) % 360}, 70%, 50%)`} // Generate distinct colors
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            ))}
                        </LineChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Add legend for multiple trees */}
                    <div className="mt-4 flex flex-wrap gap-4">
                        {MOCK_TREES.map((tree, index) => (
                            <div 
                                key={tree.id} 
                                className="flex items-center gap-2"
                            >
                                <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` }}
                                />
                                <span className="text-sm text-green-800">
                                    {tree.name || `Tree ${index + 1}`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mb-6 rounded-xl bg-white p-4 shadow-lg sm:p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendarWeek} className="text-2xl text-green-800" />
                        <h2 className="text-xl font-bold text-green-800 sm:text-2xl">{t('dashboard.weeklyCal')}</h2>
                    </div>
                    <div className="text-sm text-green-600 font-medium mb-4">
                        {getWeekRange(currentDate).start} - {getWeekRange(currentDate).end}
                    </div>
                    
                    {trees.length > 0 ? (
                        <div className="grid grid-cols-7 gap-2">
                            {generateWeekData(currentDate).map((date) => {
                                const dateKey = formatDateKey(date);
                                const isToday = formatDateKey(new Date()) === dateKey;
                                const dayEvents = events[dateKey] || [];

                                return (
                                    <div 
                                        key={dateKey}
                                        className={`p-3 rounded-xl ${
                                            isToday 
                                                ? 'bg-green-100 border-2 border-green-500' 
                                                : 'bg-white border border-gray-200'
                                        }`}
                                    >
                                        <div className="text-center mb-2">
                                            <p className="text-xs text-gray-500">{daysOfWeek[date.getDay()]}</p>
                                            <p className={`text-lg font-bold ${
                                                isToday ? 'text-green-600' : 'text-gray-800'
                                            }`}>
                                                {date.getDate()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            {dayEvents.map((event, index) => (
                                                <div key={index} 
                                                    className="tooltip relative group"
                                                    title={`${event.tree}: ${event.type}`}
                                                >
                                                    {event.type === 'water' && (
                                                        <FontAwesomeIcon icon={faDroplet} className="text-blue-500" />
                                                    )}
                                                    {event.type === 'measure' && (
                                                        <FontAwesomeIcon icon={faRuler} className="text-yellow-500" />
                                                    )}
                                                    {event.type === 'plant' && (
                                                        <FontAwesomeIcon icon={faSeedling} className="text-green-500" />
                                                    )}
                                                    <div className="tooltiptext text-xs bg-gray-800 text-white px-2 py-1 rounded 
                                                                absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap 
                                                                opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {event.tree}: {event.type}
                                                        {event.type === 'measure' && (
                                                            <><br />
                                                            Height: {event.height}cm<br />
                                                            Diameter: {event.diameter}cm
                                                            {event.status && <><br />Status: {event.status}</>}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                                <FontAwesomeIcon icon={faCalendarWeek} className="text-2xl text-green-600" />
                            </div>
                            <p className="text-gray-600">{t('dashboard.plantFirstCal')}</p>
                        </div>
                    )}
                </div>

                {/* Badges Section */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faMedal} className="text-2xl text-green-800" />
                            <h2 className="text-2xl font-bold text-green-800">{t('dashboard.recentBadges')}</h2>
                        </div>
                        {earnedBadges.length > 4 && (
                            <Link 
                                to="/badges"
                                className="text-green-600 hover:text-green-700 text-sm"
                            >
                                {t('dashboard.viewAll', { count: earnedBadges.length })}
                            </Link>
                        )}
                    </div>
                    
                    {recentBadges.length > 0 ? (
                        <div className="px-8"> {/* Added padding for arrow spacing */}
                            <Swiper
                                slidesPerView={1}
                                spaceBetween={24}
                                navigation={{
                                    nextEl: '.swiper-button-next',
                                    prevEl: '.swiper-button-prev',
                                }}
                                pagination={{ 
                                    clickable: true,
                                    dynamicBullets: true
                                }}
                                breakpoints={{
                                    // Mobile first approach
                                    640: { slidesPerView: 2 },
                                    768: { slidesPerView: 2 },
                                    1024: { slidesPerView: 3 }
                                }}
                                className="py-4" // Added vertical padding
                            >
                                {recentBadges.map(badge => (
                                    <SwiperSlide key={badge.id}>
                                        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 
                                                    rounded-lg shadow hover:shadow-md transition-shadow duration-300
                                                    mx-2" // Added horizontal margin
                                        >
                                            <FontAwesomeIcon 
                                                icon={badge.icon} 
                                                className="text-4xl text-green-600 mb-4" // Increased margin
                                            />
                                            <h3 className="font-bold text-lg text-green-700 mb-3">{badge.name}</h3>
                                            <p className="text-sm text-green-600 mb-3">{badge.description}</p>
                                            <span className="text-xs text-green-500 bg-green-50 px-3 py-1 rounded-full">
                                                {badge.category}
                                            </span>
                                        </div>
                                    </SwiperSlide>
                                ))}
                                <div className="swiper-button-prev !text-green-600 !w-8 !h-8 
                                            after:!text-2xl hover:!text-green-700 transition-colors" />
                                <div className="swiper-button-next !text-green-600 !w-8 !h-8 
                                            after:!text-2xl hover:!text-green-700 transition-colors" />
                            </Swiper>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <FontAwesomeIcon icon={faSeedling} className="text-4xl mb-2" />
                            <p>{t('dashboard.badgesEmpty')}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const handlePlantTree = () => {
        setActiveTab('tree')
    };

    const levelInfo = getLevelInfo(xpTotal);
    const prog = xpProgress(xpTotal);
    const levelLabel =
        levelInfo.key === 'forest_master'
            ? t('xp.levelMaster')
            : levelInfo.key === 'assistant'
              ? t('xp.levelAssistant')
              : t('xp.levelNew');

    return (
        <div className="">
            <CertificateModal
                open={certOpen}
                onClose={() => setCertOpen(false)}
                displayName={user?.displayName || user?.email || ''}
            />

            {/* Program overview + XP */}
            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-white p-5 shadow-lg md:col-span-2">
                    <h2 className="text-lg font-bold text-green-900">{t('dashboard.title')}</h2>
                    <p className="text-sm text-green-700">{t('dashboard.subtitle')}</p>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-green-50 p-3">
                            <p className="text-xs text-green-700">{t('dashboard.survivalTitle')}</p>
                            <p className="text-2xl font-bold text-green-900">
                                {programStats.survivalPct != null ? `${programStats.survivalPct}%` : '—'}
                            </p>
                            <p className="text-[10px] text-green-600">{t('dashboard.survivalHint')}</p>
                        </div>
                        <div className="rounded-lg bg-green-50 p-3">
                            <p className="text-xs text-green-700">{t('dashboard.treesTitle')}</p>
                            <p className="text-2xl font-bold text-green-900">{trees.length}</p>
                        </div>
                        <div className="rounded-lg bg-green-50 p-3">
                            <p className="text-xs text-green-700">{t('dashboard.growthTitle')}</p>
                            <p className="text-2xl font-bold text-green-900">{programStats.logCount}</p>
                            <p className="text-[10px] text-green-600">{t('dashboard.growthHint')}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-lg">
                    <p className="text-sm font-semibold text-green-800">{t('xp.label')}</p>
                    <p className="text-3xl font-bold text-green-600">{xpTotal}</p>
                    <p className="text-xs text-gray-600">
                        {t('xp.level')}: {levelLabel}
                    </p>
                    {levelInfo.nextAt != null && (
                        <>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded bg-green-100">
                                <div
                                    className="h-full bg-green-600 transition-all"
                                    style={{ width: `${prog.pct}%` }}
                                />
                            </div>
                            <p className="mt-1 text-[10px] text-green-700">
                                {t('xp.nextLevel')}: {prog.remaining} XP
                            </p>
                        </>
                    )}
                    {xpTotal >= 5000 && (
                        <button
                            type="button"
                            onClick={() => setCertOpen(true)}
                            className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600"
                        >
                            {t('dashboard.openCertificate')}
                        </button>
                    )}
                </div>
            </div>

            {xpTotal >= 5000 && (
                <div className="mb-6 rounded-lg bg-green-100 px-4 py-3 text-green-900">
                    {t('dashboard.certificateBanner')}{' '}
                    <button type="button" className="underline" onClick={() => setCertOpen(true)}>
                        {t('dashboard.openCertificate')}
                    </button>
                </div>
            )}

            {/* Trees List Section */}
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <FontAwesomeIcon icon={faTree} className="text-2xl text-green-800" />
                    <h2 className="text-2xl font-bold text-green-800">{t('dashboard.myTrees')}</h2>
                </div>
                {trees.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                        {trees.map(tree => (
                            <div key={tree.id} className="bg-white rounded-lg p-4 shadow">
                                {getMostRecentPicture(tree) ? (
                                    <img 
                                        src={getMostRecentPicture(tree)}
                                        alt={tree.name}
                                        className="w-full h-48 object-cover rounded-lg mb-3"
                                    />
                                ) : (
                                    <div className="w-full h-48 bg-green-100 rounded-lg mb-3 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faSeedling} className="text-4xl text-green-400" />
                                    </div>
                                )}
                                <h3 className="text-xl font-bold text-green-700">{tree.name || t('dashboard.myTree')}</h3>
                                <div className="space-y-2 mt-2 text-black-600">
                                    <p className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faTree} className="text-green-600" />
                                        <span>{t('dashboard.type')}: {tree.treeType || t('dashboard.unknownType')}</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faCalendar} className="text-green-600" />
                                        <span>{t('dashboard.planted')}: {tree.date.toLocaleDateString()}</span>
                                    </p>
                                    {(() => {
                                        const measurements = getMostRecentMeasurements(tree);
                                        return (
                                            <>
                                                <p className="flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faRuler} className="text-green-600" />
                                                    <span>
                                                        {t('dashboard.height')}: {measurements.height}cm
                                                        <span className="text-xs text-gray-500 ml-1">
                                                            ({t('dashboard.lastLogged')}: {measurements.lastLog})
                                                        </span>
                                                    </span>
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faRuler} className="text-green-600 rotate-90" />
                                                    <span>
                                                        {t('dashboard.diameter')}: {measurements.diameter}cm
                                                        <span className="text-xs text-gray-500 ml-1">
                                                            ({t('dashboard.lastLogged')}: {measurements.lastLog})
                                                        </span>
                                                    </span>
                                                </p>
                                            </>
                                        );
                                    })()}
                                    <p className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faDroplet} className="text-green-600" />
                                        <span>{t('dashboard.wateredTimes', { count: (tree.wateringDates || []).length })}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                                <FontAwesomeIcon icon={faSeedling} className="text-4xl text-green-600" />
                            </div>
                                <h3 className="text-xl font-bold text-green-800 mb-2">{t('dashboard.plantJourney')}</h3>
                            <p className="text-gray-600 mb-6">{t('dashboard.plantFirstTree')}</p>
                            <button
                                onClick={handlePlantTree}
                                className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition-colors duration-200"
                            >
                                <FontAwesomeIcon icon={faTree} />
                                <span>{t('dashboard.plantFirstTree')}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Growth Chart Section */}
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <FontAwesomeIcon icon={faChartLine} className="text-2xl text-green-800" />
                    <h2 className="text-2xl font-bold text-green-800">{t('dashboard.growth')}</h2>
                </div>
                {trees.length > 0 ? (
                    <>
                        <div className="space-y-8">
                            {/* Height Chart */}
                            <div>
                                <h3 className="text-lg font-semibold text-green-700 mb-4">{t('dashboard.heightProgress')}</h3>
                                <div className="w-full overflow-x-auto">
                                    <LineChart 
                                        width={600}
                                        height={300}
                                        data={formatGrowthData(trees)}
                                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis label={{ value: 'Height (cm)', angle: -90 }} />
                                        <Tooltip />
                                        {trees.map((tree, index) => (
                                            <Line 
                                                key={`${tree.id}-height`}
                                                type="monotone" 
                                                dataKey={`${tree.name || `Tree ${index + 1}`} (Height)`}
                                                stroke={`hsl(${(index * 137.5) % 360}, 70%, 50%)`}
                                                dot={{ r: 6 }}
                                                activeDot={{ r: 8 }}
                                            />
                                        ))}
                                    </LineChart>
                                </div>
                            </div>

                            {/* Diameter Chart */}
                            <div>
                                <h3 className="text-lg font-semibold text-green-700 mb-4">{t('dashboard.diameterProgress')}</h3>
                                <div className="w-full overflow-x-auto">
                                    <LineChart 
                                        width={600}
                                        height={300}
                                        data={formatGrowthData(trees)}
                                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis label={{ value: 'Diameter (cm)', angle: -90 }} />
                                        <Tooltip />
                                        {trees.map((tree, index) => (
                                            <Line 
                                                key={`${tree.id}-diameter`}
                                                type="monotone" 
                                                dataKey={`${tree.name || `Tree ${index + 1}`} (Diameter)`}
                                                stroke={`hsl(${(index * 137.5) % 360}, 70%, 50%)`}
                                                dot={{ r: 6 }}
                                                activeDot={{ r: 8 }}
                                            />
                                        ))}
                                    </LineChart>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-4 flex flex-wrap gap-4">
                            {trees.map((tree, index) => (
                                <div 
                                    key={tree.id} 
                                    className="flex items-center gap-2"
                                >
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` }}
                                    />
                                    <span className="text-sm text-green-800">
                                        {tree.name || `Tree ${index + 1}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                            <FontAwesomeIcon icon={faChartLine} className="text-2xl text-green-600" />
                        </div>
                        <p className="text-gray-600">{t('dashboard.plantFirst')}</p>
                    </div>
                )}
            </div>

            {/* Weekly Calendar Section */}
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <FontAwesomeIcon icon={faCalendarWeek} className="text-2xl text-green-800" />
                    <h2 className="text-2xl font-bold text-green-800">{t('dashboard.weeklyCal')}</h2>
                </div>
                <div className="text-sm text-green-600 font-medium mb-4">
                    {getWeekRange(currentDate).start} - {getWeekRange(currentDate).end}
                </div>
                
                {trees.length > 0 ? (
                    <div className="grid grid-cols-7 gap-2">
                        {generateWeekData(currentDate).map((date) => {
                            const dateKey = formatDateKey(date);
                            const isToday = formatDateKey(new Date()) === dateKey;
                            const dayEvents = events[dateKey] || [];

                            return (
                                <div 
                                    key={dateKey}
                                    className={`p-3 rounded-xl ${
                                        isToday 
                                            ? 'bg-green-100 border-2 border-green-500' 
                                            : 'bg-white border border-gray-200'
                                    }`}
                                >
                                    <div className="text-center mb-2">
                                        <p className="text-xs text-gray-500">{daysOfWeek[date.getDay()]}</p>
                                        <p className={`text-lg font-bold ${
                                            isToday ? 'text-green-600' : 'text-gray-800'
                                        }`}>
                                            {date.getDate()}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        {dayEvents.map((event, index) => (
                                            <div key={index} title={event.tree} className="tooltip">
                                                {event.type === 'water' && (
                                                    <FontAwesomeIcon icon={faDroplet} className="text-blue-500" />
                                                )}
                                                {event.type === 'measure' && (
                                                    <FontAwesomeIcon icon={faRuler} className="text-yellow-500" />
                                                )}
                                                {event.type === 'plant' && (
                                                    <FontAwesomeIcon icon={faSeedling} className="text-green-500" />
                                                )}
                                                <span className="tooltiptext text-xs">
                                                    {event.tree}: {event.type}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                            <FontAwesomeIcon icon={faCalendarWeek} className="text-2xl text-green-600" />
                        </div>
                        <p className="text-gray-600">{t('dashboard.plantFirstCal')}</p>
                    </div>
                )}
            </div>

            {/* Badges Section */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faMedal} className="text-2xl text-green-800" />
                        <h2 className="text-2xl font-bold text-green-800">{t('dashboard.recentBadges')}</h2>
                    </div>
                    {earnedBadges.length > 4 && (
                        <button 
                            onClick={() => setActiveTab('badges')}
                            className="text-green-600 hover:text-green-700 text-sm"
                        >
                            {t('dashboard.viewAll', { count: earnedBadges.length })}
                        </button>
                    )}
                </div>
                
                {recentBadges.length > 0 ? (
                    <div className="px-8"> {/* Added padding for arrow spacing */}
                        <Swiper
                            slidesPerView={1}
                            spaceBetween={24}
                            navigation={{
                                nextEl: '.swiper-button-next',
                                prevEl: '.swiper-button-prev',
                            }}
                            pagination={{ 
                                clickable: true,
                                dynamicBullets: true
                            }}
                            breakpoints={{
                                // Mobile first approach
                                640: { slidesPerView: 2 },
                                768: { slidesPerView: 2 },
                                1024: { slidesPerView: 3 }
                            }}
                            className="py-4" // Added vertical padding
                        >
                            {recentBadges.map(badge => (
                                <SwiperSlide key={badge.id}>
                                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 
                                                    rounded-lg shadow hover:shadow-md transition-shadow duration-300
                                                    mx-2 h-[280px] flex flex-col justify-between" // Added fixed height and flex layout
                                    >
                                        <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                            <FontAwesomeIcon 
                                                icon={badge.icon} 
                                                className="text-4xl text-green-600"
                                            />
                                            <h3 className="font-bold text-lg text-green-700">{badge.name}</h3>
                                            <p className="text-sm text-green-600 line-clamp-2">{badge.description}</p>
                                        </div>
                                        <span className="text-xs text-green-500 bg-green-50 px-3 py-1 rounded-full mt-auto">
                                            {badge.category}
                                        </span>
                                    </div>
                                </SwiperSlide>
                            ))}
                            <div className="swiper-button-prev !text-green-600 !w-8 !h-8 
                                         after:!text-2xl hover:!text-green-700 transition-colors" />
                            <div className="swiper-button-next !text-green-600 !w-8 !h-8 
                                         after:!text-2xl hover:!text-green-700 transition-colors" />
                        </Swiper>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <FontAwesomeIcon icon={faSeedling} className="text-4xl mb-2" />
                        <p>{t('dashboard.badgesEmpty')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;