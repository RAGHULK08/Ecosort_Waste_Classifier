import React, { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';
import GamificationDisplay from './components/GamificationDisplay';
import CameraCapture from './components/CameraCapture';
import { classifyWaste, getRegionFromCoordinates } from './services/geminiService';
import { ClassificationItem, Region, Language, Achievement } from './types';
import { REGION_CONFIGS, LOCALIZED_STRINGS, LANGUAGE_NAMES } from './constants';
import { TrophyIcon, UploadIcon } from './components/icons';
import { useGamification } from './hooks/useGamification';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const AchievementToast: React.FC<{ achievement: Achievement | null, strings: any }> = ({ achievement, strings }) => {
    if (!achievement) return null;

    return (
        <div className="fixed bottom-5 right-5 bg-gradient-to-r from-teal-500 to-green-600 text-white p-4 rounded-lg shadow-2xl z-50 animate-bounce">
            <div className="flex items-center">
                <TrophyIcon className="h-8 w-8 text-yellow-300 mr-3" />
                <div>
                    <p className="font-bold text-lg">{strings.achievementUnlocked}</p>
                    <p className="text-md">{achievement.name}</p>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<ClassificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>('India');
  const [language, setLanguage] = useState<Language>('en');
  const [privacyConsent, setPrivacyConsent] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);

  const { stats, unlockedIds, leaderboard, newlyUnlocked, processClassificationResults, clearNewAchievement } = useGamification();

  const strings = LOCALIZED_STRINGS[language];
  const currentRegionConfig = REGION_CONFIGS[region];

  useEffect(() => {
    if (!currentRegionConfig.languages.includes(language)) {
      setLanguage(currentRegionConfig.languages[0]);
    }
  }, [region, language, currentRegionConfig.languages]);

  useEffect(() => {
    if (newlyUnlocked) {
      const timer = setTimeout(() => {
        clearNewAchievement();
      }, 4000); // Hide toast after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [newlyUnlocked, clearNewAchievement]);


  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const detectedRegion = await getRegionFromCoordinates(latitude, longitude);
            if (detectedRegion) {
              setRegion(detectedRegion);
            } else {
              setLocationError("Could not determine region from your location. Defaulting to India.");
              setRegion('India');
            }
          } catch (err) {
             console.error("Error detecting region:", err);
             setLocationError("Could not determine region. Defaulting to India.");
             setRegion('India');
          } finally {
            setIsLocating(false);
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
          setLocationError("Geolocation failed or was denied. Defaulting to India settings.");
          setRegion('India');
          setIsLocating(false);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser. Defaulting to India.");
      setRegion('India');
      setIsLocating(false);
    }
  }, []);

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setResults([]);
    setError(null);
  };
  
  const handleCameraCapture = (file: File) => {
    handleImageSelect(file);
    setIsCameraOpen(false);
  };

  const handleClassify = async () => {
    if (!imageFile) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const base64Image = await fileToBase64(imageFile);
      const classificationResults = await classifyWaste(base64Image, imageFile.type, language, region);
      setResults(classificationResults);
      processClassificationResults(classificationResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
      <AchievementToast achievement={newlyUnlocked} strings={strings} />
       {isCameraOpen && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraOpen(false)}
          strings={strings}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-green-500">
            {strings.title}
          </h1>
          <div className="mt-4 flex flex-wrap justify-center items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{strings.region}: {currentRegionConfig.name}</span>
            </div>
            <div className="relative">
              <label htmlFor="language-select" className="sr-only">{strings.language}</label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {currentRegionConfig.languages.map((lang) => (
                  <option key={lang} value={lang}>{LANGUAGE_NAMES[lang]}</option>
                ))}
              </select>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center space-x-2">
                <TrophyIcon className="h-6 w-6 text-yellow-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{strings.yourScore}:</span>
                <span className="text-lg font-bold text-teal-500">{stats.totalScore}</span>
            </div>
          </div>
        </header>

        {isLocating && (
            <div className="text-center mb-6">
                <Loader />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Detecting your region for localized results...</p>
            </div>
        )}
        {locationError && (
            <div className="max-w-lg mx-auto mb-6 p-3 text-center text-sm text-yellow-800 bg-yellow-100 rounded-lg">
                {locationError}
            </div>
        )}
        
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="flex flex-col items-center">
            <ImageUploader onImageSelect={handleImageSelect} onTakePhotoClick={() => setIsCameraOpen(true)} imagePreviewUrl={imagePreviewUrl} isLoading={isLoading || isLocating} strings={strings} />
            {imageFile && (
              <div className="mt-6">
                <button
                  onClick={handleClassify}
                  disabled={isLoading || isLocating}
                  className="w-64 inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-full shadow-lg text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-transform"
                >
                  {isLoading ? (
                    <>
                      <Loader />
                      <span className="ml-3">{strings.classifying}</span>
                    </>
                  ) : (
                    <>
                      <UploadIcon className="-ml-1 mr-3 h-6 w-6" />
                      {strings.classify}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="w-full max-w-lg mx-auto">
            {error && <div className="mb-4 p-4 text-center text-red-800 bg-red-100 rounded-lg">{error}</div>}
            
            {(results.length > 0 || !imageFile) &&
             <ResultsDisplay results={results} regionConfig={currentRegionConfig} strings={strings} />
            }
          </div>
        </main>

        <section className="mt-16">
            <GamificationDisplay 
                userScore={stats.totalScore}
                unlockedAchievementIds={unlockedIds}
                leaderboard={leaderboard}
                strings={strings}
            />
        </section>
        
        <footer className="text-center mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center space-x-3">
                <label htmlFor="privacy-toggle" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">{strings.privacy}</label>
                <button
                    id="privacy-toggle"
                    onClick={() => setPrivacyConsent(!privacyConsent)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${privacyConsent ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${privacyConsent ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Powered by Google Gemini. © {new Date().getFullYear()} Eco Sort.
            </p>
        </footer>
      </div>
    </div>
  );
};

export default App;