import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Transition } from '@headlessui/react';
import { UserCircleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { getAuth } from 'firebase/auth';
import TreeList from '../myTree/TreeList';
import Badges from '../myBadges/badges';
import Calendar from '../myCalendar/calendar';
import Dashboard from './Dashboard';
import EcoLesson from './EcoLesson';
import { useAuth } from '../../context/AuthContext';
import { FaTree } from 'react-icons/fa';
import { useTab } from '../../context/TabContext';
import logo from '../../assets/logo.png'
import { clearSession } from '../../utils/sessionUtils';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const Home = () => {
    const { t } = useTranslation();
    const { activeTab, setActiveTab } = useTab();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user } = useAuth();
    const auth = getAuth();

    const navTabs = useMemo(
        () => [
            { id: 'dashboard', name: t('nav.dashboard') },
            { id: 'tree', name: t('nav.trees') },
            { id: 'badges', name: t('nav.badges') },
            { id: 'calendar', name: t('nav.calendar') },
            { id: 'lesson', name: t('nav.lesson') },
        ],
        [t]
    );

    const handleLogout = async () => {
        try {
            await auth.signOut();
            clearSession()
            window.location.href = "/";
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'tree':
                return <TreeList userId={`${user.uid.slice(0,5)}${user.uid.slice(-5)}`} />;
            case 'badges':
                return <Badges />;
            case 'calendar':
                return <Calendar />;
            case 'lesson':
                return <EcoLesson />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="min-h-[100dvh] min-h-screen bg-gradient-to-b from-green-50 to-green-100 pb-[env(safe-area-inset-bottom)]">
            <nav className="touch-manipulation bg-white shadow-lg">
                <div className="mx-auto max-w-7xl px-3 sm:px-4">
                    <div className="flex h-14 min-h-[3.5rem] justify-between sm:h-16">
                        {/* Logo and Desktop Navigation */}
                        <div className="flex space-x-8">
                            <div className="flex-shrink-0 flex items-center">
                                <img 
                                    src={logo} 
                                    alt="TreeDoctor Logo" 
                                    className="h-8 w-8 object-contain mr-2"
                                />
                                <span className="text-xl font-bold text-green-600">TreeDoctor</span>
                            </div>

                            <div className="hidden md:flex flex-wrap items-center gap-2 lg:gap-4">
                                <LanguageSwitcher />
                                {navTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-xs font-medium transition-colors duration-200 lg:text-sm ${
                                            activeTab === tab.id
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {tab.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* User Profile Menu */}
                        <div className="flex items-center">
                            {/* Mobile menu button */}
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 md:hidden"
                            >
                                {isMobileMenuOpen ? (
                                    <XMarkIcon className="block h-6 w-6" />
                                ) : (
                                    <Bars3Icon className="block h-6 w-6" />
                                )}
                            </button>

                            <Menu as="div" className="ml-3 relative">
                                <Menu.Button className="flex items-center space-x-3 hover:opacity-80">
                                    {user?.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt="Profile"
                                            className="h-8 w-8 rounded-full"
                                        />
                                    ) : (
                                        <UserCircleIcon className="h-8 w-8 text-green-600" />
                                    )}
                                    <span className="hidden md:block text-sm text-gray-700">
                                        {user?.displayName || user?.email || "Tree Doctor User"}
                                    </span>
                                </Menu.Button>

                                <Transition
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-100">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    className={`${
                                                        active ? 'bg-gray-100' : ''
                                                    } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                                                >
                                                    {user?.email}
                                                </button>
                                            )}
                                        </Menu.Item>
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={handleLogout}
                                                    className={`${
                                                        active ? 'bg-gray-100' : ''
                                                    } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                                                >
                                                    {t('common.signOut')}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        </div>
                    </div>

                    {/* Mobile Navigation Menu */}
                    <Transition
                        show={isMobileMenuOpen}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <div className="md:hidden">
                            <div className="px-3 pb-3">
                                <LanguageSwitcher className="w-full justify-center" />
                            </div>
                            <div className="pt-2 pb-3 space-y-1">
                                {navTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`block min-h-11 w-full touch-manipulation py-3 pl-3 pr-3 text-left text-base font-medium ${
                                            activeTab === tab.id
                                                ? 'bg-green-50 text-green-600'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                        }`}
                                    >
                                        {tab.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Transition>
                </div>
            </nav>

            <main className="container mx-auto max-w-full px-3 py-4 sm:px-4 sm:py-8">
                {renderContent()}
            </main>
        </div>
    );
};

export default Home;