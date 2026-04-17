import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { uploadProfilePicture } from '../services/firebaseService';
import { IconCamera, IconImage, IconChevronDown, IconChevronUp } from './Icons';

interface ProfileProps {
  user: User | null;
  customPhotoURL: string | null;
  onLogout: () => void;
  onLogin: () => void;
  onPhotoUpdated: (newUrl: string) => void;
}

const FAQ_ITEMS = [
  {
    question: "How does the AI analysis work?",
    answer: "We use Google's Gemini AI to read the full content of financial news articles. It extracts the key takeaways, identifies affected sectors and stocks, and determines the potential market impact (Bullish, Bearish, or Neutral)."
  },
  {
    question: "Is my watchlist synced across devices?",
    answer: "Yes! If you are logged in with your Google account, your watchlist is securely saved to the cloud and will automatically sync across any device where you log in."
  },
  {
    question: "How often are the news feeds updated?",
    answer: "The app checks for new articles from our sources every 30 seconds while you have it open, ensuring you always see the latest headlines."
  }
];

const Profile: React.FC<ProfileProps> = ({ user, customPhotoURL, onLogout, onLogin, onPhotoUpdated }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setShowPhotoOptions(false);
    setIsUploading(true);
    try {
      const newUrl = await uploadProfilePicture(user, file);
      onPhotoUpdated(newUrl);
    } catch (error) {
      console.error("Failed to upload photo", error);
      alert("Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <IconCamera className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Sign In Required</h2>
        <p className="text-slate-400 mb-8 max-w-sm">Sign in to sync your watchlist across devices and access personalized settings.</p>
        <button 
          onClick={onLogin}
          className="bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-500 transition-all w-full max-w-xs shadow-lg shadow-teal-500/20"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto pb-24">
      {/* Profile Header */}
      <div className="card-glass-static p-6 mb-6 shadow-lg">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800">
              {isUploading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <img 
                  src={customPhotoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=3b82f6&color=fff`} 
                  alt="Profile" 
                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsImageModalOpen(true)}
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            
            <button 
              onClick={() => setShowPhotoOptions(!showPhotoOptions)}
              className="absolute bottom-0 right-0 bg-teal-600 text-white p-2 rounded-full shadow-lg hover:bg-teal-500 transition-all shadow-teal-500/30"
              disabled={isUploading}
            >
              <IconCamera className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isImageModalOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                  onClick={() => setIsImageModalOpen(false)}
                >
                  <motion.img 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    src={customPhotoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=3b82f6&color=fff`} 
                    alt="Profile Enlarged" 
                    className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
                    onClick={(e) => e.stopPropagation()}
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showPhotoOptions && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-10 w-48"
                >
                  <button 
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-sm transition-colors text-left"
                  >
                    <IconCamera className="w-4 h-4 text-slate-400" />
                    Take Photo
                  </button>
                  <div className="h-px bg-slate-700 w-full"></div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-sm transition-colors text-left"
                  >
                    <IconImage className="w-4 h-4 text-slate-400" />
                    Choose from Library
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden Inputs */}
            <input 
              type="file" 
              accept="image/*" 
              capture="user" 
              ref={cameraInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </div>
          
          <h2 className="text-xl font-bold text-white">{user.displayName || 'Financial Explorer'}</h2>
          <p className="text-slate-400 text-sm">{user.email}</p>
        </div>
      </div>

      {/* Settings Section */}
      <div className="card-glass-static p-6 mb-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-white">Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-slate-200">Push Notifications</p>
              <p className="text-xs text-slate-400">Get alerted for breaking market news</p>
            </div>
            <button 
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${notificationsEnabled ? 'bg-teal-600 shadow-lg shadow-teal-500/30' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notificationsEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>
          
          <div className="h-px bg-slate-800 w-full"></div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-slate-200">Data Management</p>
              <p className="text-xs text-slate-400">Clear local cache to free up space</p>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('finintel_news_cache_v3');
                alert("Local cache cleared!");
              }}
              className="text-sm text-teal-400 hover:text-teal-300 transition-all font-medium"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card-glass-static p-6 mb-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-white">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className="border border-slate-700/30 rounded-xl overflow-hidden">
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <span className="font-medium text-sm text-slate-200">{item.question}</span>
                {openFaqIndex === idx ? <IconChevronUp className="w-4 h-4 text-slate-400" /> : <IconChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              <AnimatePresence>
                {openFaqIndex === idx && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 text-sm text-slate-400 border-t border-slate-700/50 mt-2">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Logout Button */}
      <button 
        onClick={onLogout}
        className="w-full bg-slate-900/50 hover:bg-red-500/15 text-red-400 border border-slate-700/30 hover:border-red-500/30 py-3 rounded-xl font-medium transition-all"
      >
        Sign Out
      </button>
    </div>
  );
};

export default Profile;
