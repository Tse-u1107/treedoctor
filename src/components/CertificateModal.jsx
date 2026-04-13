import { useTranslation } from 'react-i18next';

export default function CertificateModal({ open, onClose, displayName }) {
  const { t, i18n } = useTranslation();
  if (!open) return null;

  const dateStr = new Date().toLocaleDateString(i18n.language?.startsWith('mn') ? 'mn-MN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div
          id="eco-certificate-print"
          className="relative border-8 border-double border-green-700 bg-gradient-to-b from-green-50 to-white p-10 text-center sm:min-w-[480px]"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-green-800">TreeDoctor</p>
          <h2 className="mt-4 text-3xl font-bold text-green-900 md:text-4xl">{t('certificate.title')}</h2>
          <div className="mx-auto my-8 h-px max-w-xs bg-green-300" />
          <p className="text-green-800">{t('certificate.body')}</p>
          <p className="mt-8 text-lg">
            <span className="font-medium text-gray-600">{t('certificate.name')}: </span>
            <span className="font-bold text-gray-900">{displayName || '—'}</span>
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {t('certificate.date')}: {dateStr}
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-green-100 px-6 py-4">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-50"
            onClick={onClose}
          >
            {t('certificate.close')}
          </button>
          <button
            type="button"
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
            onClick={() => window.print()}
          >
            {t('certificate.print')}
          </button>
        </div>
      </div>
    </div>
  );
}
