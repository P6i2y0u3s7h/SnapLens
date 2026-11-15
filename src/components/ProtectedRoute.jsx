import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Camera, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading, setIsAuthModalOpen } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) {
      // Prompt auth modal automatically when arriving on protected feature
      setIsAuthModalOpen(true);
    }
  }, [loading, currentUser, setIsAuthModalOpen]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0F] z-50 flex flex-col items-center justify-center select-none">
        <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl snap-gradient opacity-20 animate-ping" />
          <div className="w-14 h-14 rounded-2xl snap-gradient flex items-center justify-center shadow-lg shadow-[#FFFC00]/25">
            <Camera className="w-7 h-7 text-black animate-pulse" />
          </div>
        </div>
        <span className="text-xs font-bold text-white/50 tracking-widest uppercase">
          Verifying Account...
        </span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0F] text-white z-40 flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-3xl p-8 sm:p-10 max-w-sm sm:max-w-md w-full border border-white/15 shadow-2xl my-auto text-center"
        >
          {/* Glowing Lock / Snap Icon */}
          <div className="w-16 h-16 rounded-3xl snap-gradient mx-auto flex items-center justify-center text-black font-black text-2xl mb-4 shadow-xl shadow-[#FFFC00]/25">
            🔒
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFC00]/15 text-[#FFFC00] text-[10px] font-bold tracking-wider uppercase mb-3 border border-[#FFFC00]/30">
            <span>Login Required</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">
            Access SnapLens Features
          </h2>
          <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-8">
            You must be logged in to use the live camera, AR face lenses, creative photo editor, chat, stories, and cloud memories.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full btn-snap py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#FFFC00]/20"
            >
              <LogIn className="w-4 h-4 text-black" />
              <span>Sign In / Create Account</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full glass-pill py-2.5 text-xs font-semibold text-white/60 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Home</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return children;
}
