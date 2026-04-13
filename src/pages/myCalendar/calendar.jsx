import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDroplet,
    faRuler,
    faSeedling,
} from '@fortawesome/free-solid-svg-icons';
import ProtectedRoute from '../../components/ProtectedRoute';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';

const formatDateKey = (date) => {
    const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date);

    return new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate()
    ).toISOString().split('T')[0];
};

const eventTypeLabel = (t, type) => {
    const map = {
        water: 'calendar.eventWater',
        measure: 'calendar.eventMeasure',
        plant: 'calendar.eventPlant',
    };
    const key = map[type];
    return key ? t(key) : type;
};

const formatStatusForDisplay = (t, status) => {
    if (!status) return '';
    if (status === 'healthy') return t('calendar.statusHealthy');
    if (status === 'dead') return t('calendar.statusDead');
    return status;
};

const MonthlyView = ({ currentDate, events, daysOfWeek, t, dateLocale }) => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const firstDayOfMonth = firstDay.getDay();

    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();

    const calendarDays = [];

    const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const prevMonthDays = firstDayOfMonth;

    for (let i = prevMonthDays - 1; i >= 0; i--) {
        const date = new Date(prevMonthLastDay);
        date.setDate(prevMonthLastDay.getDate() - i);
        calendarDays.push({ date, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
        calendarDays.push({ date, isCurrentMonth: true });
    }

    const remainingDays = 42 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
        calendarDays.push({ date, isCurrentMonth: false });
    }

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold sm:text-xl">
                    {currentDate.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })}
                </h2>
            </div>

            <div className="mb-4 grid grid-cols-7 gap-1 sm:gap-4">
                {daysOfWeek.map((day, i) => (
                    <div key={i} className="text-center text-[10px] font-semibold text-gray-600 sm:text-sm">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const dateKey = formatDateKey(date);
                    const isToday = formatDateKey(new Date()) === dateKey;
                    const dayEvents = events[dateKey] || [];

                    return (
                        <div
                            key={index}
                            className={`min-h-[64px] p-1 sm:min-h-[80px] sm:p-2 ${
                                isToday
                                    ? 'rounded-lg border-2 border-green-500 bg-green-100'
                                    : isCurrentMonth
                                      ? 'hover:bg-gray-50'
                                      : 'bg-gray-50 text-gray-400'
                            }`}
                        >
                            <p
                                className={`mb-1 text-xs sm:text-sm ${
                                    isToday ? 'font-bold text-green-600' : ''
                                }`}
                            >
                                {date.getDate()}
                            </p>
                            <div className="flex flex-wrap gap-0.5 sm:gap-1">
                                {dayEvents.map((event, i) => {
                                    const typeStr = eventTypeLabel(t, event.type);
                                    const titleBase = `${event.tree}: ${typeStr}`;
                                    const statusDisp =
                                        event.type === 'measure' && event.status
                                            ? formatStatusForDisplay(t, event.status)
                                            : '';

                                    return (
                                        <div
                                            key={i}
                                            className="group tooltip relative"
                                            title={titleBase}
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
                                            <div
                                                className="tooltiptext absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                                            >
                                                {event.tree}: {typeStr}
                                                {event.type === 'measure' && (
                                                    <>
                                                        <br />
                                                        {t('calendar.heightCm', { cm: event.height ?? '—' })}
                                                        <br />
                                                        {t('calendar.diameterCm', { d: event.diameter ?? '—' })}
                                                        {event.status && (
                                                            <>
                                                                <br />
                                                                {t('calendar.statusLine', {
                                                                    status: statusDisp,
                                                                })}
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Calendar = () => {
    const { t, i18n } = useTranslation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [slideDirection, setSlideDirection] = useState('left');
    const [events, setEvents] = useState({});
    const { user } = useAuth();

    const daysOfWeek = useMemo(
        () =>
            t('calendar.days', { returnObjects: true }) || [
                'Sun',
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Sat',
            ],
        [t]
    );

    const dateLocale = i18n.language?.startsWith('mn') ? 'mn-MN' : 'en-US';

    useEffect(() => {
        const fetchEvents = async () => {
            if (!user) return;

            try {
                const processedEvents = {};
                const treesRef = collection(
                    db,
                    'userTrees',
                    `${user.uid.slice(0, 5)}${user.uid.slice(-5)}`,
                    'trees'
                );
                const treesSnapshot = await getDocs(treesRef);

                treesSnapshot.forEach((docSnap) => {
                    const tree = docSnap.data();

                    if (tree.date) {
                        const plantedDate = formatDateKey(tree.date);
                        processedEvents[plantedDate] = [
                            ...(processedEvents[plantedDate] || []),
                            { type: 'plant', tree: tree.name },
                        ];
                    }

                    if (tree.wateringDates) {
                        tree.wateringDates.forEach((waterDate) => {
                            const date = formatDateKey(waterDate);
                            processedEvents[date] = [
                                ...(processedEvents[date] || []),
                                { type: 'water', tree: tree.name },
                            ];
                        });
                    }

                    if (tree.logs) {
                        tree.logs.forEach((log) => {
                            if (log.date) {
                                const date = formatDateKey(log.date);
                                processedEvents[date] = [
                                    ...(processedEvents[date] || []),
                                    {
                                        type: 'measure',
                                        tree: tree.name,
                                        height: log.height,
                                        diameter: log.diameter,
                                        status: log.status,
                                    },
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

    const navigateMonth = (direction) => {
        setSlideDirection(direction < 0 ? 'right' : 'left');
        setCurrentDate((prevDate) => {
            const newDate = new Date(prevDate);
            newDate.setMonth(prevDate.getMonth() + direction);
            return newDate;
        });
    };

    return (
        <ProtectedRoute>
            <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
                <h1 className="mb-4 text-2xl font-bold text-green-800 sm:mb-6 sm:text-3xl">
                    {t('calendar.title')}
                </h1>

                <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                    <button
                        type="button"
                        onClick={() => navigateMonth(-1)}
                        className="min-h-11 w-full touch-manipulation rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700 transition-colors hover:bg-green-100 sm:w-auto sm:min-h-0"
                    >
                        {t('calendar.prevMonth')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentDate(new Date())}
                        className="min-h-11 w-full touch-manipulation rounded-lg bg-green-100 px-4 py-2.5 text-sm text-green-700 transition-colors hover:bg-green-200 sm:w-auto sm:min-h-0"
                    >
                        {t('calendar.today')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigateMonth(1)}
                        className="min-h-11 w-full touch-manipulation rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700 transition-colors hover:bg-green-100 sm:w-auto sm:min-h-0"
                    >
                        {t('calendar.nextMonth')}
                    </button>
                </div>

                <div className="relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
                            initial={{ x: slideDirection === 'left' ? 300 : -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: slideDirection === 'left' ? -300 : 300, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                            className="rounded-xl bg-white p-3 shadow-lg sm:p-6"
                        >
                            <MonthlyView
                                currentDate={currentDate}
                                events={events}
                                daysOfWeek={daysOfWeek}
                                t={t}
                                dateLocale={dateLocale}
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="mt-4 rounded-lg bg-white p-3 shadow-sm sm:mt-6 sm:p-4">
                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-8">
                        <div className="flex items-center justify-center gap-2 sm:justify-start">
                            <FontAwesomeIcon icon={faDroplet} className="text-blue-500" />
                            <span className="text-sm text-gray-600">{t('calendar.legendWatered')}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 sm:justify-start">
                            <FontAwesomeIcon icon={faRuler} className="text-yellow-500" />
                            <span className="text-sm text-gray-600">{t('calendar.legendLogged')}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 sm:justify-start">
                            <FontAwesomeIcon icon={faSeedling} className="text-green-500" />
                            <span className="text-sm text-gray-600">{t('calendar.legendPlanted')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default Calendar;
