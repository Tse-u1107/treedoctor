import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { setSession } from '../../../utils/sessionUtils';

const Login = () => {
    const { t } = useTranslation();

	const auth = getAuth()
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            const userData = {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
            };
            setSession(userData);
            
            // Redirect to admin dashboard if admin user
            if (userData.email === "admin.treedoctor@gmail.com") {
                navigate('/admin');
            } else {
                navigate('/home');
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const handleForgotPassword = async () => {
        if (!formData.email) {
            setError(t('auth.enterEmailFirst', { defaultValue: 'Эхлээд и-мэйл хаягаа оруулна уу.' }));
            return;
        }

        try {
            await sendPasswordResetEmail(auth, formData.email);
            setResetSent(true);
            setError('');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}
            
            {resetSent && (
                <div className="bg-green-50 text-green-500 p-3 rounded-lg text-sm">
                    {t('auth.resetSent', { defaultValue: 'Нууц үг шинэчлэх и-мэйл илгээгдлээ. И-мэйлээ шалгана уу.' })}
                </div>
            )}

            <div>
                <label className="block text-gray-700 mb-2" htmlFor="email">
                    {t('auth.email')}
                </label>
                <input
                    type="email"
                    id="email"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                />
            </div>

            <div>
                <label className="block text-gray-700 mb-2" htmlFor="password">
                    {t('auth.password')}
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
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

            <div className="flex justify-end">
                <button
                    type="button"
                    className="text-sm text-green-600 hover:text-green-700"
                    onClick={handleForgotPassword}
                >
                    {t('auth.forgotPassword', { defaultValue: 'Нууц үгээ мартсан уу?' })}
                </button>
            </div>

            <button
                type="submit"
                className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors"
            >
                {t('auth.signIn')}
            </button>
        </form>
    );
};

export default Login;