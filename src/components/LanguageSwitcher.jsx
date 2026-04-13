import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation();

  return (
    <div className={`inline-flex rounded-lg border border-green-200 bg-white p-0.5 text-sm shadow-sm ${className}`}>
      {['mn', 'en'].map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          className={`rounded-md px-2 py-1 font-medium transition-colors ${
            i18n.language.startsWith(lng)
              ? 'bg-green-600 text-white'
              : 'text-green-800 hover:bg-green-50'
          }`}
        >
          {t(`lang.${lng}`)}
        </button>
      ))}
    </div>
  );
}
