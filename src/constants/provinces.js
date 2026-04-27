export const MONGOLIA_PROVINCES = [
  'Arkhangai',
  'Bayan-Olgii',
  'Bayankhongor',
  'Bulgan',
  'Darkhan-Uul',
  'Dornod',
  'Dornogovi',
  'Dundgovi',
  'Govi-Altai',
  'Govisumber',
  'Khentii',
  'Khovd',
  'Khuvsgul',
  'Orkhon',
  'Ovorkhangai',
  'Omnogovi',
  'Selenge',
  'Sukhbaatar',
  'Tov',
  'Uvs',
  'Zavkhan',
  'Ulaanbaatar',
];

export const PROVINCE_LABELS_MN = {
  Arkhangai: 'Архангай',
  'Bayan-Olgii': 'Баян-Өлгий',
  Bayankhongor: 'Баянхонгор',
  Bulgan: 'Булган',
  'Darkhan-Uul': 'Дархан-Уул',
  Dornod: 'Дорнод',
  Dornogovi: 'Дорноговь',
  Dundgovi: 'Дундговь',
  'Govi-Altai': 'Говь-Алтай',
  Govisumber: 'Говьсүмбэр',
  Khentii: 'Хэнтий',
  Khovd: 'Ховд',
  Khuvsgul: 'Хөвсгөл',
  Orkhon: 'Орхон',
  Ovorkhangai: 'Өвөрхангай',
  Omnogovi: 'Өмнөговь',
  Selenge: 'Сэлэнгэ',
  Sukhbaatar: 'Сүхбаатар',
  Tov: 'Төв',
  Uvs: 'Увс',
  Zavkhan: 'Завхан',
  Ulaanbaatar: 'Улаанбаатар',
};

const PROVINCE_ALIASES = {
  // Latin spelling variants
  arhangay: 'Arkhangai',
  arkhangai: 'Arkhangai',
  'bayan-olgii': 'Bayan-Olgii',
  'bayan-olgiy': 'Bayan-Olgii',
  bayanolgii: 'Bayan-Olgii',
  bayankhongor: 'Bayankhongor',
  bulgan: 'Bulgan',
  'darkhan-uul': 'Darkhan-Uul',
  darkhanuul: 'Darkhan-Uul',
  dornod: 'Dornod',
  dornogovi: 'Dornogovi',
  dundgovi: 'Dundgovi',
  'govi-altai': 'Govi-Altai',
  govialtai: 'Govi-Altai',
  govisumber: 'Govisumber',
  govisumber: 'Govisumber',
  khentii: 'Khentii',
  hentiy: 'Khentii',
  khovd: 'Khovd',
  hovd: 'Khovd',
  khuvsgul: 'Khuvsgul',
  huvsgul: 'Khuvsgul',
  hovsgol: 'Khuvsgul',
  orkhon: 'Orkhon',
  ovorkhangai: 'Ovorkhangai',
  omnogovi: 'Omnogovi',
  selenge: 'Selenge',
  sukhbaatar: 'Sukhbaatar',
  tovs: 'Tov',
  tov: 'Tov',
  uvs: 'Uvs',
  zavkhan: 'Zavkhan',
  dzavhan: 'Zavkhan',
  ulaanbaatar: 'Ulaanbaatar',
  // Mongolian labels
  архангай: 'Arkhangai',
  'баян-өлгий': 'Bayan-Olgii',
  баянхонгор: 'Bayankhongor',
  булган: 'Bulgan',
  'дархан-уул': 'Darkhan-Uul',
  дорнод: 'Dornod',
  дорноговь: 'Dornogovi',
  дундговь: 'Dundgovi',
  'говь-алтай': 'Govi-Altai',
  говьсүмбэр: 'Govisumber',
  хэнтий: 'Khentii',
  ховд: 'Khovd',
  хөвсгөл: 'Khuvsgul',
  орхон: 'Orkhon',
  өвөрхангай: 'Ovorkhangai',
  өмнөговь: 'Omnogovi',
  сэлэнгэ: 'Selenge',
  сүхбаатар: 'Sukhbaatar',
  төв: 'Tov',
  увс: 'Uvs',
  завхан: 'Zavkhan',
  улаанбаатар: 'Ulaanbaatar',
};

export function normalizeProvinceKey(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (MONGOLIA_PROVINCES.includes(raw)) return raw;

  const lower = raw.toLowerCase();
  const collapsed = lower.replace(/\s+/g, '').replace(/_/g, '-');
  return PROVINCE_ALIASES[lower] || PROVINCE_ALIASES[collapsed] || raw;
}

export function getProvinceLabelMn(provinceKey = '') {
  const key = normalizeProvinceKey(provinceKey);
  return PROVINCE_LABELS_MN[key] || provinceKey || '-';
}
