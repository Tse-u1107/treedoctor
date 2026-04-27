import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { getProvinceLabelMn, normalizeProvinceKey } from '../constants/provinces';
import mongoliaProvincesSvg from '../assets/mongolia-provinces.svg?raw';

const PROVINCE_TO_MAP_ID = {
  Arkhangai: 'MN073',
  'Bayan-Olgii': 'MN071',
  Bayankhongor: 'MN069',
  Bulgan: 'MN067',
  'Darkhan-Uul': 'MN037',
  Dornod: 'MN061',
  Dornogovi: 'MN063',
  Dundgovi: 'MN059',
  'Govi-Altai': 'MN065',
  Govisumber: 'MN064',
  Khentii: 'MN039',
  Khovd: 'MN043',
  Khuvsgul: 'MN041',
  Orkhon: 'MN035',
  Ovorkhangai: 'MN055',
  Omnogovi: 'MN053',
  Selenge: 'MN049',
  Sukhbaatar: 'MN051',
  Tov: 'MN047',
  Uvs: 'MN046',
  Zavkhan: 'MN057',
  Ulaanbaatar: 'MN1',
};
const MAP_ID_TO_PROVINCE = Object.fromEntries(
  Object.entries(PROVINCE_TO_MAP_ID).map(([province, id]) => [id, province])
);

export default function ProvinceCoverage({ source = 'private' }) {
  const { t } = useTranslation();
  const [provinceCounts, setProvinceCounts] = useState({});
  const STORAGE_KEY = 'treedoctor_province_counts_v1';

  const readCachedCounts = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const persistCounts = (counts) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(counts || {}));
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    // Render quickly on public page from latest known data.
    const cached = readCachedCounts();
    if (Object.keys(cached).length > 0) setProvinceCounts(cached);

    if (source === 'public') {
      const unsubPublic = onSnapshot(
        doc(db, 'publicStats', 'provinceCoverage'),
        (snap) => {
          const data = snap.data() || {};
          const counts = data.counts && typeof data.counts === 'object' ? data.counts : {};
          setProvinceCounts(counts);
          if (Object.keys(counts).length > 0) persistCounts(counts);
        },
        (e) => {
          console.error('Province coverage public load failed', e);
          const fallback = readCachedCounts();
          if (Object.keys(fallback).length > 0) setProvinceCounts(fallback);
        }
      );
      return () => unsubPublic();
    }

    const unsubPrivate = onSnapshot(
      collection(db, 'userTrees'),
      async (snap) => {
        const counts = {};
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const p = normalizeProvinceKey(d.province);
          if (!p) return;
          counts[p] = (counts[p] || 0) + 1;
        });

        setProvinceCounts(counts);
        persistCounts(counts);

        // Keep a minimal public aggregate up to date for landing page.
        try {
          await setDoc(
            doc(db, 'publicStats', 'provinceCoverage'),
            { counts, updatedAt: serverTimestamp() },
            { merge: true }
          );
        } catch (syncErr) {
          // Non-blocking: private map still works.
          console.error('Province coverage public sync failed', syncErr);
        }
      },
      (e) => {
        console.error('Province coverage private load failed', e);
        const fallback = readCachedCounts();
        if (Object.keys(fallback).length > 0) setProvinceCounts(fallback);
      }
    );

    return () => unsubPrivate();
  }, [source]);

  const styledSvg = useMemo(() => {
    let svg = mongoliaProvincesSvg;

    // Remove default static fill and set light base.
    svg = svg.replace('fill="#6f9c76"', 'fill="#d1d5db"');
    svg = svg.replace('width="1000"', 'width="100%"');
    svg = svg.replace('height="481"', 'height="100%"');

    Object.entries(PROVINCE_TO_MAP_ID).forEach(([province, mapId]) => {
      const count = provinceCounts[province] || 0;
      const fill = count > 0 ? '#10b981' : '#d1d5db';
      const stroke = count > 0 ? '#047857' : '#9ca3af';
      const pattern = new RegExp(`<path([^>]*id="${mapId}"[^>]*)>`, 'g');
      svg = svg.replace(
        pattern,
        (_m, attrs) => `<path${attrs} name="${province}" fill="${fill}" stroke="${stroke}" stroke-width="1.2">`
      );
    });

    // Hide source data points.
    svg = svg.replace(/<g id="points">[\s\S]*?<\/g>/, '');

    // Replace label circles with Mongolian text labels directly on the map.
    svg = svg.replace(
      /<g id="label_points">([\s\S]*?)<\/g>/,
      (_, content) => {
        const textNodes = [];
        const circleRegex = /<circle class="[^"]*" cx="([^"]+)" cy="([^"]+)" id="([^"]+)">[\s\S]*?<\/circle>/g;
        let match;
        while ((match = circleRegex.exec(content)) !== null) {
          const cx = Number(match[1]);
          const cy = Number(match[2]);
          const mapId = match[3];
          const provinceKey = MAP_ID_TO_PROVINCE[mapId];
          const label = getProvinceLabelMn(provinceKey);
          if (!label) continue;
          textNodes.push(
            `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="700" fill="#1f2937" stroke="#ffffff" stroke-width="0.8" paint-order="stroke">${label}</text>`
          );
        }
        return `<g id="label_points">${textNodes.join('')}</g>`;
      }
    );

    return svg;
  }, [provinceCounts]);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <h3 className="text-base font-bold text-green-800 sm:text-lg">{t('province.title')}</h3>
      </div>
      <p className="mb-3 text-xs text-gray-600 sm:text-sm">{t('province.subtitle')}</p>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div
          className="w-full"
          role="img"
          aria-label={t('province.mapAria', { defaultValue: 'Mongolia province coverage map' })}
          dangerouslySetInnerHTML={{ __html: styledSvg }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 sm:text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            {t('province.legendJoined', { defaultValue: 'Бүртгэлтэй' })}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-gray-300" />
            {t('province.legendNotJoined', { defaultValue: 'Бүртгэлгүй' })}
          </span>
        </div>
      </div>
    </div>
  );
}
