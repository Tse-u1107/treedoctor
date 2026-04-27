import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import toast, { Toaster } from 'react-hot-toast';
import { MONGOLIA_PROVINCES, getProvinceLabelMn } from '../../../constants/provinces';

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = getAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    school: '',
    province: '',
    className: '',
    role: 'student',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setError('Passwords do not match');
      return;
    }

    const loadingToast = toast.loading('Creating your account...');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password).catch((err) => {
        if (err.code === 'auth/network-request-failed') {
          throw new Error('Network error. Please check your connection or disable ad blockers.');
        }
        if (err.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered.');
        }
        throw err;
      });

      const userCollectionId = `${userCredential.user.uid.slice(0, 5)}${userCredential.user.uid.slice(-5)}`;

      await setDoc(doc(db, 'userTrees', userCollectionId), {
        email: userCredential.user.email,
        fullName: formData.fullName,
        school: formData.school,
        province: formData.province,
        className: formData.className,
        role: formData.role,
        createdAt: new Date(),
        uid: userCredential.user.uid,
      }).catch(() => {
        throw new Error('Failed to initialize user data. Please try again.');
      });

      toast.dismiss(loadingToast);
      toast.success('Account created successfully!');
      navigate('/home');
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err.message.replace('Firebase: ', '').replace(/\(auth.*\)/, '');
      toast.error(errorMessage);
      setError(errorMessage);
      console.error('Registration error:', {
        code: err.code,
        message: err.message,
        name: err.name,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{error}</div>}

      <div>
        <label className="mb-2 block text-gray-700" htmlFor="fullName">{t('auth.fullName')}</label>
        <input
          type="text"
          id="fullName"
          className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-gray-700" htmlFor="school">{t('auth.school')}</label>
          <input
            type="text"
            id="school"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
            value={formData.school}
            onChange={(e) => setFormData({ ...formData, school: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-gray-700" htmlFor="className">{t('auth.className')}</label>
          <input
            type="text"
            id="className"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
            value={formData.className}
            onChange={(e) => setFormData({ ...formData, className: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-gray-700" htmlFor="province">{t('auth.province')}</label>
          <select
            id="province"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
            value={formData.province}
            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            required
          >
            <option value="">{t('auth.selectProvince')}</option>
            {MONGOLIA_PROVINCES.map((p) => (
              <option key={p} value={p}>{getProvinceLabelMn(p)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-gray-700" htmlFor="role">{t('auth.role')}</label>
          <select
            id="role"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="student">{t('auth.roleStudent')}</option>
            <option value="teacher">{t('auth.roleTeacher')}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-gray-700" htmlFor="email">{t('auth.email')}</label>
        <input
          type="email"
          id="email"
          className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-gray-700" htmlFor="password">{t('auth.password')}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-gray-700" htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
          </button>
        </div>
      </div>

      <button type="submit" className="w-full rounded-lg bg-green-500 py-3 text-white transition-colors hover:bg-green-600">
        {t('auth.createAccount')}
      </button>

      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            style: {
              background: '#ecfdf5',
              border: '1px solid #059669',
              color: '#065f46',
            },
            iconTheme: {
              primary: '#059669',
              secondary: '#ecfdf5',
            },
          },
          error: {
            style: {
              background: '#fef2f2',
              border: '1px solid #dc2626',
              color: '#991b1b',
            },
          },
          duration: 3000,
        }}
      />
    </form>
  );
};

export default Register;
