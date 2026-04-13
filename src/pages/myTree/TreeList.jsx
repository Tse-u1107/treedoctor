import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import MapPicker from '../../components/MapPicker';
import { awardXpAndSyncProfile, XP_REWARDS } from '../../utils/xpUtils';
import { FaTree, FaSeedling, FaLeaf, FaHeart, FaStar } from 'react-icons/fa';
import { 
    faRuler, 
    faMessage,
    faPlus,
    faTree,
    faSeedling,
    faArrowRight,
    faTreeCity,
    faCloudSun,
} from '@fortawesome/free-solid-svg-icons';
import { Dialog, Transition, DialogPanel, DialogTitle } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import confetti from 'canvas-confetti';
import { checkAndAwardBadges } from '../../utils/badgeUtils';
import toast, { Toaster } from 'react-hot-toast';
import TreeCard from './components/TreeCard';
import TreeGuideButton from './components/TreeGuideButton';

const TreeList = ({ userId }) => {
    const { t } = useTranslation();
    const [trees, setTrees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTree, setNewTree] = useState({
        name: '',
        height: null,
        diameter: null, // Add this line
        images: [],
        message: '',
        treeType: '' // Add this line
    });
    const [isDragging, setIsDragging] = useState(false);
    const [currentPhase, setCurrentPhase] = useState(0);
    const [slideDirection, setSlideDirection] = useState('left');
    const [mapLat, setMapLat] = useState(null);
    const [mapLng, setMapLng] = useState(null);
    const [locationLabel, setLocationLabel] = useState('');

    const getCharacterCountColor = (length, max) => {
        if (length > max * 0.9) return 'text-red-500';
        if (length > max * 0.7) return 'text-yellow-500';
        return 'text-gray-500';
    };


    const fields = useMemo(
        () => [
            { phase: 1, titleKey: 'tree.fieldPhase.name', icon: faTree, required: true },
            { phase: 2, titleKey: 'tree.fieldPhase.type', icon: faTreeCity, required: true },
            { phase: 3, titleKey: 'tree.fieldPhase.height', icon: faRuler, required: true },
            { phase: 4, titleKey: 'tree.fieldPhase.diameter', icon: faRuler, required: true },
            { phase: 5, titleKey: 'tree.fieldPhase.picture', icon: faCloudSun, required: false },
            { phase: 6, titleKey: 'tree.fieldPhase.capsule', icon: faMessage, required: false },
            { phase: 7, titleKey: 'tree.fieldPhase.ready', icon: faSeedling, required: false },
        ],
        [t]
    );


    const TREE_TYPES = [
        "Apple - Алим",
        "Sea buckthorn - Чацаргана", // More accurately "Sea buckthorn", but commonly referred to as apricot-like
        "Ash - Хайлаас",
        "Aspen - Улиас",
        "Birch - Хус",
        "Boxelder - Шар хуайс", // A type of maple or similar
        "Buckthorn - Долоогоно",
        "Cherry - Гүйлс",
        "Chinese hawthorn - Үхрийн нүд", // Not a common English tree, closest fruiting shrub
        "Cedar - Гацуур",
        "Cotoneaster - Голт бор", // Flowering shrub often used in hedges
        "Crabapple - Бүйлс", // Related to cherry/apricot
        "Elm - Улиас", // Already covered
        "Fir - Шинэс",
        "Lilac - Модон", // “Модон” might be misinterpreted; likely ornamental or leafy tree, interpreted here as lilac
        "Locust - Шар хуайс",
        "Maple - Шар хуайс", // Double match
        "Pine - Нарс",
        "Poplar - Улиас", // Sometimes also used interchangeably with Aspen
        "Seabuckthorn - Чацаргана",
        "Spruce - Гацуур",
        "Willow - Бургас",
        "Zelkova - Агч", // "Агч" is a type of maple, but in Mongolian context, it’s close to Zelkova or ornamental maple
        "Plum - Монос"
    ].sort();

    useEffect(() => {
        fetchTrees();
    }, [userId]);

    const isCurrentPhaseValid = () => {
        switch (currentPhase) {
            case 1:
                return newTree.name.trim() !== '';
            case 2:
                return (customTreeType !==  '' && newTree.treeType === 'Other') || newTree.treeType !== '';
            case 3:
                return newTree.height > 0;
            case 4:
                return newTree.diameter > 0;
            default:
                return true;
        }
    };


    const fetchTrees = async () => {
        try {
            const treesRef = collection(db, 'userTrees', userId, 'trees');
            const querySnapshot = await getDocs(treesRef);

            const treesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTrees(treesList);
            setLoading(false);
            return treesList;
        } catch (error) {
            console.error('Error fetching trees:', error);
            setLoading(false);
            return [];
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleImageClick = () => {
        document.getElementById('imageInput').click();
    };


    // Add this helper function to convert File to Base64
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    };

    // if (loading) return <div>Loading...</div>;

    const compressImage = async (file) => {
        const options = {
            maxSizeMB: 0.128, // 128KB
            maxWidthOrHeight: 800,
            useWebWorker: true
        };
        
        try {
            const compressedFile = await imageCompression(file, options);
            return compressedFile;
        } catch (error) {
            console.error('Error compressing image:', error);
            throw error;
        }
    };

    // Update the handleNewTree function
    const handleNewTree = async () => {
        if (trees.length >= 3) {
            alert(t('tree.maxTrees'));
            return;
        }
        
        try {
            let imageBase64Array = [];
            for (const image of newTree.images) {
                const compressedImage = await compressImage(image);
                const base64 = await convertToBase64(compressedImage);
                imageBase64Array.push(base64);
            }

            const now = new Date();
            
            // Create the first log with initial measurements
            const initialLog = {
                date: now,
                height: parseInt(newTree.height) || 0,
                diameter: parseInt(newTree.diameter) || 0,
                note: "Initial planting measurements",
                status: "healthy",
                picture: imageBase64Array[0] || null // Use first image for log if available
            };

            const treeDoc = {
                name: newTree.name || 'My Tree',
                date: now,
                pictures: imageBase64Array,
                capsule: newTree.message || 'None',
                treeType: newTree.treeType === "Other" ? customTreeType : newTree.treeType || 'Unknown',
                wateringDates: [],
                lastWatered: null,
                // Add initial log
                logs: [initialLog],
                // Keep these for backwards compatibility
                heights: {
                    [now.toISOString()]: parseInt(newTree.height) || 0
                },
                diameters: {
                    [now.toISOString()]: parseInt(newTree.diameter) || 0
                },
                locationLabel: locationLabel || '',
                ...(mapLat != null && mapLng != null ? { lat: mapLat, lng: mapLng } : {}),
            };

            const treesRef = collection(db, 'userTrees', userId, 'trees');
            await setDoc(doc(treesRef), treeDoc);
            
            setIsModalOpen(false);
            setNewTree({ 
                name: '', 
                height: 0, 
                diameter: 0,
                images: [],
                message: '',
                treeType: ''
            });
            setCurrentPhase(0);
            setMapLat(null);
            setMapLng(null);
            setLocationLabel('');

            toast.success(t('tree.plantingSuccess'));
            
            // Show confetti if this is the first tree
            if (trees.length === 0) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            
            const list = await fetchTrees();
            await checkAndAwardBadges(userId, list);
            await awardXpAndSyncProfile(userId, XP_REWARDS.tree_registered);
        } catch (error) {
            console.error('Error creating tree:', error);
            toast.error(t('tree.plantFail'));
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files = Array.from(e.dataTransfer.files);
        if (newTree.images.length + files.length > 3) {
            toast.error('Maximum 3 images allowed');
            return;
        }

        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        setNewTree(prev => ({
            ...prev,
            images: [...prev.images, ...imageFiles].slice(0, 3)
        }));
    };

    const handleImageInput = async (e) => {
        const files = Array.from(e.target.files);
        if (newTree.images.length + files.length > 3) {
            toast.error('Maximum 3 images allowed');
            return;
        }
        
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        setNewTree(prev => ({
            ...prev,
            images: [...prev.images, ...imageFiles].slice(0, 3)
        }));
    };

    const goToNextPhase = () => {
        setSlideDirection('left');
        setCurrentPhase(prev => prev + 1);
        if (customTreeType) {
            setNewTree({...newTree, treeType: customTreeType})
        }
    };

    const [customTreeType, setCustomTreeType] = useState('');

    // Add new function to handle phase navigation
    const handleNextPhase = () => {
        if (currentPhase < 7) { // Update to 7
            setCurrentPhase(prev => prev + 1);
        } else {
            handleNewTree();
        }
    };

    // Modify the renderTreeSection to handle phases
    const renderTreeSection = () => {
        if (loading) return (
            <div className="flex justify-center items-center h-64">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <FaSeedling className="text-4xl text-green-600" />
                </motion.div>
            </div>
        );

        if (trees.length === 0) {
            return (
                <div className="relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {currentPhase === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ x: slideDirection === 'left' ? 300 : -300, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -300, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8"
                            >
                                <div className="text-center space-y-6 max-w-2xl mx-auto">
                                    <FaSeedling className="text-6xl text-green-600 mx-auto" />
                                    <h2 className="text-2xl font-bold text-green-800">{t('tree.welcomeTitle')}</h2>
                                    <p className="text-green-600">
                                        {t('tree.welcomeBody')}
                                    </p>
                                    <div className="space-y-4 bg-green-50/80 p-6 rounded-xl">
                                        <h3 className="font-bold text-green-700">{t('tree.whyTitle')}</h3>
                                        <ul className="text-left space-y-2">
                                            <li className="flex items-center gap-2">
                                                <FaLeaf className="text-green-500" />
                                                <span>{t('tree.whyCli')}</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <FaHeart className="text-green-500" />
                                                <span>{t('tree.whyMem')}</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <FaStar className="text-green-500" />
                                                <span>{t('tree.whyGrow')}</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <button
                                        onClick={goToNextPhase}
                                        className="bg-green-600 px-8 py-4 rounded-xl hover:bg-green-700 
                                                 transition-all transform hover:scale-105 shadow-md flex items-center 
                                                 gap-2 mx-auto"
                                    >
                                        {t('tree.getStarted')}
                                        <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {currentPhase > 0 && currentPhase <= 7 && (
                            <motion.div
                                key={`phase-${currentPhase}`}
                                initial={{ x: 300, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -300, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8"
                            >
                                <div className="text-center space-y-6 max-w-2xl mx-auto">
                                    <FontAwesomeIcon 
                                        icon={fields[currentPhase - 1].icon} 
                                        className="text-6xl text-green-600" 
                                    />
                                    <h2 className="text-2xl font-bold text-green-800">
                                        {t(fields[currentPhase - 1].titleKey)}
                                    </h2>

                                    {/* Render appropriate input field based on phase */}
                                    {currentPhase === 1 && (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={newTree.name}
                                                onChange={(e) => setNewTree({...newTree, name: e.target.value})}
                                                className="w-full p-3 border border-green-200 rounded-lg"
                                                placeholder="Enter tree name"
                                            />
                                            <p className="text-md text-green-600">
                                                Enter the given name of your green friend!
                                            </p>
                                        </div>
                                    )}
                                    {currentPhase === 2 && (
                                        <div className="space-y-2">
                                            <select
                                                value={newTree.treeType}
                                                onChange={(e) => setNewTree({...newTree, treeType: e.target.value})}
                                                className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                            >
                                                <option value="">Select a tree type</option>
                                                {TREE_TYPES.map(type => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                                <option value="Other">Other</option>
                                            </select>
                                            <TreeGuideButton />

                                            <p className="text-md text-green-600">
                                                Choose the type of tree you're planting
                                            </p>
                                            
                                            {
                                                newTree.treeType === 'Other' &&
                                                (<input
                                                    type="text"
                                                    value={customTreeType}
                                                    onChange={(e) => {
                                                        setCustomTreeType(e.target.value)
                                                    }}
                                                    className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                    placeholder="e.g., Oak, Birch, Pine"
                                                />)
                                            }
                                        </div>
                                    )}
                                    {currentPhase === 3 && (
                                        <div className="space-y-2">
                                            <input
                                                type="number"
                                                value={newTree?.height}
                                                onChange={(e) => setNewTree({...newTree, height: e.target.value})}
                                                className="w-full p-2 border rounded-md"
                                                placeholder="Enter initial height in CM"
                                            />
                                            <p className="text-sm text-green-600">
                                                Measure the height of your friend using a meter! (CM)
                                            </p>
                                        </div>
                                    )}
                                    {currentPhase === 4 && (
                                        <div className="space-y-2">
                                            <input
                                                type="number"
                                                value={newTree.diameter}
                                                onChange={(e) => setNewTree({...newTree, diameter: e.target.value})}
                                                className="w-full p-3 border border-green-200 rounded-lg"
                                                placeholder="Enter initial diameter in CM"
                                            />
                                            <p className="text-sm text-green-600">
                                                The diameter is the circumference divided by π! (CM)
                                            </p>
                                        </div>
                                    )}
                                    {currentPhase === 5 && (
                                        <div className="space-y-2">
                                            <div
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                onClick={handleImageClick}
                                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                                                    isDragging 
                                                        ? 'bg-green-50 border-green-500 scale-105' 
                                                        : 'border-green-200 hover:bg-green-50 hover:border-green-300'
                                                }`}
                                            >
                                                <input
                                                    id="imageInput"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageInput}
                                                    className="hidden"
                                                    multiple // Add this
                                                />
                                                {newTree.images.length > 0 ? (
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {newTree.images.map((image, index) => (
                                                                <div key={index} className="relative">
                                                                    <img
                                                                        src={URL.createObjectURL(image)}
                                                                        alt={`Upload ${index + 1}`}
                                                                        className="w-full h-24 object-cover rounded-lg"
                                                                    />
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setNewTree(prev => ({
                                                                                ...prev,
                                                                                images: prev.images.filter((_, i) => i !== index)
                                                                            }));
                                                                        }}
                                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="text-sm text-green-600">
                                                            {3 - newTree.images.length} more {3 - newTree.images.length === 1 ? 'photo' : 'photos'} allowed
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500">
                                                        Drop up to 3 images here or click to select
                                                    </p>
                                                )}
                                            </div>
                                            <p className="text-sm text-green-600">
                                                Select up to 3 pictures of your tree with yourself, and family!
                                            </p>
                                        </div>
                                    )}
                                    {currentPhase === 6 && (
                                        <div className="space-y-2">
                                            <textarea
                                                value={newTree.message}
                                                onChange={(e) => setNewTree({...newTree, message: e.target.value})}
                                                maxLength={600}
                                                className="w-full p-3 border border-green-200 rounded-lg h-24"
                                                placeholder="Write your time capsule message (600 characters max)"
                                            />
                                            <p className="text-sm text-green-600">
                                                You'll see this in 6 years! For example, describe how was the weather, or leave a message for your future self!
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex justify-between mt-8">
                                        <button
                                            onClick={() => setCurrentPhase(prev => prev - 1)}
                                            className="px-6 py-2 text-green-600 hover:text-green-700"
                                            disabled={currentPhase === 1}
                                        >
                                            {t('common.back')}
                                        </button>
                                    <button
                                        onClick={handleNextPhase}
                                        disabled={fields[currentPhase - 1].required && !isCurrentPhaseValid()}
                                        className={`px-8 py-3 rounded-xl transition-all transform shadow-md ${
                                            fields[currentPhase - 1].required && !isCurrentPhaseValid()
                                                ? 'bg-gray-300 cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-700 hover:scale-105'
                                        }`}
                                    >
                                        {currentPhase === 7 ? t('tree.letsGo') : t('common.next')}
                                    </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        // For existing trees, show the regular view with "Plant New Tree" button
        return (
            <div className="grid grid-cols-1 gap-6 sm:gap-8">
                <TreeCard 
                    userId={userId}
                    trees={trees}
                    updateTrigger={() => fetchTrees()}
                />
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-md active:bg-green-800 sm:w-auto sm:self-start sm:px-6 sm:text-base"
                >
                    <FontAwesomeIcon icon={faPlus} className="shrink-0" aria-hidden />
                    <span className="break-words">{t('tree.plantNew')}</span>
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
            <div className="container mx-auto max-w-full px-3 py-4 sm:px-4 sm:py-8">
                {/* Header Section */}
                <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white/80 p-4 shadow-lg backdrop-blur-sm sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
                    <h1 className="min-w-0 text-2xl font-bold leading-tight text-green-800 sm:text-3xl">
                        {t('tree.header')}
                    </h1>
                    <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                        <span className="text-center text-sm font-medium text-green-700 sm:text-left sm:text-base">
                            {t('common.treesCount', { current: trees.length })}
                        </span>
                        {trees.length < 3 && (
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-green-700 active:bg-green-800 sm:w-auto sm:shrink-0 sm:px-6 sm:text-base sm:hover:scale-[1.02]"
                            >
                                <FontAwesomeIcon icon={faPlus} className="shrink-0" aria-hidden />
                                <span className="text-center leading-snug">{t('tree.plantNew')}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Trees Section */}
                {renderTreeSection()}

                {/* New Tree Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <Dialog
                            as={motion.div}
                            static
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            open={isModalOpen}
                            onClose={() => {
                                setIsModalOpen(false);
                                setMapLat(null);
                                setMapLng(null);
                                setLocationLabel('');
                            }}
                            className="fixed inset-0 z-50 overflow-y-auto"
                        >

                            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

                            <div className="flex items-center justify-center min-h-screen px-4">
                                
                                <motion.div
                                    initial={{ scale: 0.95 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.95 }}
                                    className="relative mx-3 w-full max-w-md rounded-2xl border border-green-100 bg-white p-4 shadow-2xl sm:mx-4 sm:p-8"
                                >
                                    <div className="text-2xl font-bold text-green-800 mb-6 flex items-center gap-3">
                                        <FaSeedling className="text-green-600" />
                                        {t('tree.plantNew')}
                                    </div>
                                    
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (trees.length >= 3) {
                                            alert(t('tree.maxTrees'));
                                            return;
                                        }
                                        
                                        try {
                                            // Convert image to Base64

                                            let imageBase64Array = [];
                                            for (const image of newTree.images) {
                                                const compressedImage = await compressImage(image);
                                                const base64 = await convertToBase64(compressedImage);
                                                imageBase64Array.push(base64);
                                            }

                                            const now = new Date();
                                            
                                            // Create the first log with initial measurements
                                            const initialLog = {
                                                date: now,
                                                height: parseInt(newTree.height) || 0,
                                                diameter: parseInt(newTree.diameter) || 0,
                                                note: "Initial planting measurements",
                                                status: "healthy",
                                                picture: imageBase64Array[0] || null // Use first image for log if available
                                            };

                                            const treeDoc = {
                                                name: newTree.name || 'My Tree',
                                                date: now,
                                                pictures: imageBase64Array,
                                                capsule: newTree.message || 'None',
                                                treeType: newTree.treeType === "Other" ? customTreeType : newTree.treeType || 'Unknown',
                                                wateringDates: [],
                                                lastWatered: null,
                                                // Add initial log
                                                logs: [initialLog],
                                                // Keep these for backwards compatibility
                                                heights: {
                                                    [now.toISOString()]: parseInt(newTree.height) || 0
                                                },
                                                diameters: {
                                                    [now.toISOString()]: parseInt(newTree.diameter) || 0
                                                },
                                                locationLabel: locationLabel || '',
                                                ...(mapLat != null && mapLng != null ? { lat: mapLat, lng: mapLng } : {}),
                                            };

                                            const treesRef = collection(db, 'userTrees', userId, 'trees');
                                            await setDoc(doc(treesRef), treeDoc);
                                            
                                            setIsModalOpen(false);
                                            setNewTree({ 
                                                name: '', 
                                                height: 0, 
                                                diameter: 0,
                                                images: [],
                                                message: '',
                                                treeType: ''
                                            });
                                            setMapLat(null);
                                            setMapLng(null);
                                            setLocationLabel('');

                                            toast.success(t('tree.plantingSuccess'));

                                            // Show confetti if this is the first tree
                                            confetti({
                                                particleCount: 100,
                                                spread: 70,
                                                origin: { y: 0.6 }
                                            });
                                            
                                            const list = await fetchTrees();
                                            await checkAndAwardBadges(userId, list);
                                            await awardXpAndSyncProfile(userId, XP_REWARDS.tree_registered);
                                        } catch (error) {
                                            console.error('Error creating tree:', error);
                                            toast.error(t('tree.plantFail'));

                                        }
                                    }} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-green-700 mb-2">
                                                Tree Name
                                            </label>
                                            <input
                                                type="text"
                                                value={newTree.name}
                                                onChange={(e) => setNewTree({...newTree, name: e.target.value})}
                                                className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                placeholder="Enter tree name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Height (cm)
                                            </label>
                                            <input
                                                type="number"
                                                value={newTree.height}
                                                onChange={(e) => setNewTree({...newTree, height: e.target.value})}
                                                className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Initial Diameter (cm)
                                            </label>
                                            <input
                                                type="number"
                                                value={newTree.diameter}
                                                onChange={(e) => setNewTree({...newTree, diameter: e.target.value})}
                                                className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-green-700 mb-2">
                                                Tree Type
                                            </label>
                                            <select
                                                value={newTree.treeType}
                                                onChange={(e) => setNewTree({...newTree, treeType: e.target.value})}
                                                className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                            >
                                                <option value="">Select a tree type</option>
                                                {TREE_TYPES.map(type => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                                <option value="Other">Other</option>
                                            </select>
                                            {
                                                newTree.treeType == 'Other' &&
                                                <input
                                                    type="text"
                                                    value={customTreeType}
                                                    onChange={(e) => setCustomTreeType(e.target.value)}
                                                    className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                    placeholder="e.g., Oak, Birch, Pine"
                                                />
                                            }
                                        </div>
                                        <TreeGuideButton />

                                        <div>
                                            <label className="block text-sm font-medium text-green-700 mb-2">
                                                {t('tree.location')}
                                            </label>
                                            <input
                                                type="text"
                                                value={locationLabel}
                                                onChange={(e) => setLocationLabel(e.target.value)}
                                                className="mb-2 w-full p-3 border border-green-200 rounded-lg"
                                                placeholder={t('tree.location')}
                                            />
                                            <p className="mb-2 text-xs text-green-700">{t('tree.mapPickHint')}</p>
                                            <MapPicker
                                                lat={mapLat}
                                                lng={mapLng}
                                                onChange={(la, ln) => {
                                                    setMapLat(la);
                                                    setMapLng(ln);
                                                }}
                                                heightClass="h-48"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('tree.photos')}
                                            </label>
                                            <div
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                onClick={handleImageClick}
                                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                                                    isDragging 
                                                        ? 'bg-green-50 border-green-500 scale-105' 
                                                        : 'border-green-200 hover:bg-green-50 hover:border-green-300'
                                                }`}
                                            >
                                                <input
                                                    id="imageInput"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageInput}
                                                    className="hidden"
                                                    multiple
                                                />
                                                {newTree.images.length > 0 ? (
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {newTree.images.map((image, index) => (
                                                                <div key={index} className="relative">
                                                                    <img
                                                                        src={URL.createObjectURL(image)}
                                                                        alt={`Upload ${index + 1}`}
                                                                        className="w-full h-24 object-cover rounded-lg"
                                                                    />
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setNewTree(prev => ({
                                                                                ...prev,
                                                                                images: prev.images.filter((_, i) => i !== index)
                                                                            }));
                                                                        }}
                                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="text-sm text-green-600">
                                                            {3 - newTree.images.length} more {3 - newTree.images.length === 1 ? 'photo' : 'photos'} allowed
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500">
                                                        Drop up to 3 images here or click to select
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Time Capsule Message
                                            </label>
                                            <textarea
                                                value={newTree.message}
                                                onChange={(e) => setNewTree({...newTree, message: e.target.value})}
                                                maxLength={600}
                                                className="w-full p-3 border border-green-200 rounded-lg h-24"
                                                placeholder="Write your message (600 characters max)"
                                            />
                                            <p className={`text-sm mt-1 ${getCharacterCountColor(newTree.message.length || 0, 600)}`}>
                                                {newTree.message.length}/600 characters
                                            </p>
                                        </div>

                                        <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => setIsModalOpen(false)}
                                                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-300 shadow-md"
                                            >
                                                Let's go! 🌱
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        </Dialog>
            )}
                </AnimatePresence>
            </div>
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
        </div>
    );
};

export default TreeList;