import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSeedling, faArrowRight, faHeart, faLeaf, faUsers } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';

const TreeProjectLanding = () => {
  const { t } = useTranslation();

  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <FontAwesomeIcon icon={faSeedling} className="text-emerald-700" />
            </div>
            <div>
              <p className="text-base font-bold text-emerald-900">{t('landing.brand')}</p>
              <p className="text-xs text-emerald-700">Таны модны аяллын хамтрагч</p>
            </div>
          </div>

          <button
            onClick={handleGetStarted}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
          >
            {t('landing.getStarted')}
          </button>
        </div>
      </nav>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 text-sm text-emerald-800 shadow-sm">
              <FontAwesomeIcon icon={faLeaf} />
              Сурагч бүрийн мод ургах түүхийг хамтдаа бүтээе
            </div>

            <h1 className="text-3xl font-bold leading-tight text-emerald-950 sm:text-5xl">
              Модны мэдээлэл, зураг, өдөр тутмын тэмдэглэл
              <span className="block text-emerald-700">нэг дор, ойлгомжтой</span>
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
              TreeDoctor нь багш, сурагч, эцэг эхэд зориулагдсан энгийн платформ. Хэн ямар мод тарьсан,
              хэрхэн ургаж буйг бодит мэдээллээр нь шууд харж, ангиараа ахиц дэвшлээ хамтдаа хянаарай.
            </p>

            <button
              onClick={handleGetStarted}
              className="mt-8 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-7 py-3 text-base font-bold text-white shadow-lg hover:from-emerald-700 hover:to-teal-700"
            >
              {t('landing.beginProject')}
              <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </button>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 sm:pb-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            icon={faSeedling}
            title="Хувийн хяналт"
            text="Сурагч бүр өөрийн модны зураг, усалгаа, өсөлт, тэмдэглэлээ хөтөлнө."
          />
          <Card
            icon={faUsers}
            title="Багшийн самбар"
            text="Анги, сургууль, аймгаар нь шүүж харж, сурагчдын ахиц, тэмдэглэлийг нэг дороос хяарна."
          />
          <Card
            icon={faLeaf}
            title="Бодит нөлөө"
            text="Тарьсан мод бүрийн явцыг харах нь хүүхдүүдэд байгальд хайртай дадал өгдөг."
          />
        </div>
      </section>

      <footer className="border-t border-emerald-100 bg-white/85 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-center sm:px-6">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-emerald-800">TreeDoctor</span> — багш, сурагчдад зориулсан модны
            арчилгааны дижитал дэвтэр.
          </p>
          <p className="text-xs text-slate-500">
            <FontAwesomeIcon icon={faHeart} className="mr-1 text-rose-500" />
            Монголын сургуулиудын ногоон ирээдүйд зориулан бүтээв.
          </p>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} TreeDoctor. Бүх эрх хуулиар хамгаалагдсан.</p>
        </div>
      </footer>
    </div>
  );
};

function Card({ icon, title, text }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
        <FontAwesomeIcon icon={icon} className="text-emerald-700" />
      </div>
      <h3 className="text-base font-bold text-emerald-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
    </motion.div>
  );
}

export default TreeProjectLanding;
