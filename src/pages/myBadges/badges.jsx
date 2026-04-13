import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { badgeCategories } from '../../config/badges';
import ProtectedRoute from '../../components/ProtectedRoute';
import { FaSeedling } from 'react-icons/fa';

const BadgeCard = ({ badge, categoryKey, category, isEarned, t }) => {
    const name = t(`badges.items.${badge.id}.name`, { defaultValue: badge.name });
    const desc = t(`badges.items.${badge.id}.desc`, { defaultValue: badge.description });
    const unit = t(`badges.categories.${categoryKey}.unit`, { defaultValue: category.measurement });
    const unitSuffix = unit ? ` ${unit}` : '';

    let footer;
    if (isEarned) {
        footer = t('badges.unlocked');
    } else if (badge.isSecret) {
        footer = t('badges.secretLabel');
    } else {
        footer = t('badges.required', {
            req: badge.requirement,
            unit: unitSuffix,
        });
    }

    return (
        <div
            className={`flex min-h-[min(280px,52vw)] touch-manipulation flex-col rounded-xl p-4 shadow-md transition-transform active:scale-[0.99] sm:min-h-[300px] sm:p-6 sm:hover:scale-[1.02] ${
                isEarned
                    ? 'border border-green-200 bg-gradient-to-br from-green-50 to-green-100'
                    : 'border border-gray-200 bg-gray-50'
            }`}
        >
            <div className={`mb-3 text-center sm:mb-4 ${isEarned ? '' : 'opacity-40'}`}>
                <FontAwesomeIcon
                    icon={badge.icon}
                    className={`text-3xl sm:text-4xl ${isEarned ? 'text-green-600' : 'text-gray-400'}`}
                />
            </div>
            <div className="flex flex-1 flex-col">
                <h3
                    className={`mb-2 text-center text-base font-bold leading-snug sm:text-lg ${
                        isEarned ? 'text-green-800' : 'text-gray-500'
                    }`}
                >
                    {name}
                </h3>
                <p
                    className={`text-center text-xs leading-relaxed sm:text-sm ${
                        isEarned ? 'text-green-700' : 'text-gray-400'
                    }`}
                >
                    {desc}
                </p>
            </div>
            <div className="mt-auto border-t border-dashed border-green-200 pt-3 sm:pt-4">
                <p
                    className={`text-center text-[11px] leading-tight sm:text-xs ${
                        isEarned ? 'text-green-600' : 'text-gray-400'
                    }`}
                >
                    {footer}
                </p>
            </div>
        </div>
    );
};

const BadgeSection = ({ categoryKey, category, earnedBadges, t }) => {
    return (
        <div className="mb-8 sm:mb-12">
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-white p-3 shadow-sm sm:mb-6 sm:gap-3 sm:p-4">
                <FontAwesomeIcon icon={category.icon} className="text-xl text-green-600 sm:text-2xl" />
                <h2 className="text-lg font-bold leading-tight text-green-800 sm:text-xl">
                    {t(`badges.categories.${categoryKey}.title`, { defaultValue: category.title })}
                </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {category.badges.map((badge) => (
                    <BadgeCard
                        key={badge.id}
                        badge={badge}
                        categoryKey={categoryKey}
                        category={category}
                        isEarned={earnedBadges.includes(badge.id)}
                        t={t}
                    />
                ))}
            </div>
        </div>
    );
};

const MOCK_EARNED_BADGES = ['first_sip', 'tiny_sprout', 'early_bird', 'thirst_quencher'];

const Badges = ({ isPreview = false }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [earnedBadges, setEarnedBadges] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBadges = async () => {
            if (!user) return;
            if (isPreview) return;
            setLoading(true);

            try {
                const userCollectionId = `${user.uid.slice(0, 5)}${user.uid.slice(-5)}`;
                const badgesRef = collection(db, 'userTrees', userCollectionId, 'badges');
                const snapshot = await getDocs(badgesRef);

                const badges = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setEarnedBadges(badges.map((badge) => badge.id));
            } catch (error) {
                console.error('Error fetching badges:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBadges();
    }, [user, isPreview]);

    if (isPreview) {
        const previewCategories = {
            watering: badgeCategories.watering,
            height: badgeCategories.height,
        };

        return (
            <div className="p-3 sm:p-6">
                {Object.entries(previewCategories).map(([key, category]) => (
                    <div key={key} className="mb-6 sm:mb-8">
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-white p-3 shadow-sm sm:mb-6 sm:gap-3 sm:p-4">
                            <FontAwesomeIcon icon={category.icon} className="text-xl text-green-600 sm:text-2xl" />
                            <h2 className="text-lg font-bold text-green-800 sm:text-xl">
                                {t(`badges.categories.${key}.title`, { defaultValue: category.title })}
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                            {category.badges.slice(0, 2).map((badge) => (
                                <BadgeCard
                                    key={badge.id}
                                    badge={badge}
                                    categoryKey={key}
                                    category={category}
                                    isEarned={MOCK_EARNED_BADGES.includes(badge.id)}
                                    t={t}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-green-50/50 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
                    <div className="mb-6 rounded-xl bg-white p-4 shadow-lg sm:mb-8 sm:p-6">
                        <h1 className="text-2xl font-bold leading-tight text-green-800 sm:text-3xl">
                            {t('badges.pageTitle')}
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-green-700 sm:text-base">
                            {t('badges.pageSubtitle')}
                        </p>
                    </div>
                    {loading && (
                        <div className="flex h-48 items-center justify-center sm:h-64">
                            <FaSeedling className="size-10 animate-spin text-green-600 sm:size-12" />
                        </div>
                    )}

                    {!loading &&
                        Object.entries(badgeCategories).map(([key, category]) => (
                            <BadgeSection
                                key={key}
                                categoryKey={key}
                                category={category}
                                earnedBadges={earnedBadges}
                                t={t}
                            />
                        ))}
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default Badges;
