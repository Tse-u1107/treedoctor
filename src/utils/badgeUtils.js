import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { badgeCategories } from '../config/badges';

const toJsDate = (d) => {
    if (!d) return null;
    return d.toDate ? d.toDate() : new Date(d);
};

const formatYMD = (d) => {
    const dt = toJsDate(d);
    if (!dt || Number.isNaN(dt.getTime())) return null;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getMaxConsecutiveWateringDays = (trees) => {
    const days = new Set();
    trees.forEach((tree) => {
        (tree.wateringDates || []).forEach((w) => {
            const k = formatYMD(w);
            if (k) days.add(k);
        });
    });
    const sorted = [...days].sort();
    if (sorted.length === 0) return 0;
    let best = 1;
    let cur = 1;
    for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(`${sorted[i - 1]}T12:00:00`);
        const next = new Date(`${sorted[i]}T12:00:00`);
        const diff = (next - prev) / 86400000;
        if (diff === 1) cur += 1;
        else cur = 1;
        best = Math.max(best, cur);
    }
    return best;
};

export const checkAndAwardBadges = async (userId, trees) => {
    try {
        const totalWaterings = trees.reduce(
            (sum, tree) => sum + (tree.wateringDates?.length || 0),
            0
        );

        // Get maximum height across all trees
        const maxHeight = Math.max(...trees.map(tree => {
            const heights = Object.values(tree.heights || {});
            return heights.length ? Math.max(...heights) : 0;
        }));

        // Get oldest tree age in days
        const oldestTreeDate = Math.min(...trees.map(tree => 
            tree.date?.toDate?.() || new Date()));
        const ageInDays = Math.floor((new Date() - oldestTreeDate) / (1000 * 60 * 60 * 24));

        // Get existing badges
        const badgesRef = collection(db, 'userTrees', userId, 'badges');
        const snapshot = await getDocs(badgesRef);
        const existingBadges = new Set(snapshot.docs.map(doc => doc.id));

        // Check watering badges
        for (const badge of badgeCategories.watering.badges) {
            if (!existingBadges.has(badge.id) && totalWaterings >= badge.requirement) {
                await setDoc(doc(badgesRef, badge.id), {
                    earnedAt: new Date(),
                    type: 'watering'
                });
            }
        }

        // Check height badges
        for (const badge of badgeCategories.height.badges) {
            if (!existingBadges.has(badge.id) && maxHeight >= badge.requirement) {
                await setDoc(doc(badgesRef, badge.id), {
                    earnedAt: new Date(),
                    type: 'height'
                });
            }
        }

        // Check age badges
        for (const badge of badgeCategories.age.badges) {
            if (!existingBadges.has(badge.id) && ageInDays >= badge.requirement) {
                await setDoc(doc(badgesRef, badge.id), {
                    earnedAt: new Date(),
                    type: 'age'
                });
            }
        }

        // Check secret badges
        // Early Bird (water between 5-7 AM)
        const hasEarlyMorningWatering = trees.some(tree => 
            tree.wateringDates?.some(date => {
                const hour = date.toDate().getHours();
                return hour >= 5 && hour < 7;
            })
        );
        if (!existingBadges.has('early_bird') && hasEarlyMorningWatering) {
            await setDoc(doc(badgesRef, 'early_bird'), {
                earnedAt: new Date(),
                type: 'secret'
            });
        }

        const streak = getMaxConsecutiveWateringDays(trees);
        if (!existingBadges.has('water_streak_7') && streak >= 7) {
            await setDoc(doc(badgesRef, 'water_streak_7'), {
                earnedAt: new Date(),
                type: 'consistency'
            });
        }

    } catch (error) {
        console.error('Error checking badges:', error);
    }
};