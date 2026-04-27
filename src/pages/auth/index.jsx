import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Login from './login/login';
import Register from './register/register';
import './auth.css';
import { motion } from 'framer-motion';
import SessionCheck from './SessionCheck';

const Auth = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);

  return (
    <>
      <SessionCheck />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
        <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 md:grid-cols-2">
          <div className="hidden md:flex flex-col justify-between p-10">
            <div>
              <p className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700">
                TreeDoctor
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-emerald-950">
                {t('auth.welcomeTitle', { defaultValue: 'Ногоон ирээдүйгээ хамтдаа бүтээе' })}
              </h1>
              <p className="mt-3 max-w-md text-slate-600">
                {t('auth.welcomeSubtitle', {
                  defaultValue:
                    'Сурагчдын модны өсөлт, усалгаа, тэмдэглэлийг нэг дороос удирдах хамгийн энгийн платформ.',
                })}
              </p>
            </div>
            <div className="ui-card-hero p-5">
              <p className="text-sm font-semibold text-emerald-800">
                {t('auth.welcomeHint', {
                  defaultValue: 'Нэвтэрч орон анги, сургууль, модны мэдээллээ үргэлжлүүлээрэй.',
                })}
              </p>
            </div>
          </div>

          <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="ui-card-hero w-full max-w-md p-5 sm:p-7"
            >
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-emerald-900">{t('landing.brand')}</h2>
                <p className="mt-1 text-sm text-slate-600">{t('auth.signIn')}</p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-white/80 p-1">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    isLogin ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setIsLogin(true)}
                >
                  {t('auth.signIn')}
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    !isLogin ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setIsLogin(false)}
                >
                  {t('auth.register')}
                </button>
              </div>

              <motion.div
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: isLogin ? -14 : 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isLogin ? <Login /> : <Register />}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;