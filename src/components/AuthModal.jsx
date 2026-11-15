import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
];

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, login, register, isFirebaseConfigured } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName || email.split('@')[0], selectedAvatar);
      }
    } catch {
      // Error toast already displayed
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm sm:max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full glass-pill flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Logo & Headline */}
          <div className="text-center mb-6">
            <img
              src="/logo.png"
              alt="SnapLens Logo"
              className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-lg shadow-[#FFFC00]/25 object-cover border border-white/15"
            />
            <h2 className="text-2xl font-black text-white">
              {mode === 'login' ? 'Sign in to SnapLens' : 'Join SnapLens'}
            </h2>
            <p className="text-xs text-white/60 mt-1">
              {isFirebaseConfigured
                ? 'Connected to Firebase Authentication'
                : 'Local Secure Session Mode Active'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex rounded-2xl bg-white/5 p-1 mb-6 border border-white/10">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-[#FFFC00] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-[#FFFC00] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                {/* Avatar Preset Selector */}
                <div>
                  <span className="text-[11px] font-semibold text-white/70 block mb-2">
                    Choose Your Bitmoji / Avatar:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {AVATAR_PRESETS.map((av) => (
                      <button
                        type="button"
                        key={av}
                        onClick={() => setSelectedAvatar(av)}
                        className={`w-11 h-11 rounded-full flex-shrink-0 overflow-hidden border-2 transition-transform ${
                          selectedAvatar === av
                            ? 'scale-110 border-[#FFFC00] shadow-md shadow-[#FFFC00]/30'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={av} alt="Avatar" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/70 block mb-1">
                    Display Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="e.g. Alex Rivers"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/30 text-xs sm:text-sm focus:outline-none focus:border-[#FFFC00]"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/30 text-xs sm:text-sm focus:outline-none focus:border-[#FFFC00]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/30 text-xs sm:text-sm focus:outline-none focus:border-[#FFFC00]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-snap py-3 text-xs sm:text-sm font-bold text-black flex items-center justify-center gap-2 shadow-lg shadow-[#FFFC00]/25 mt-6"
            >
              <span>{isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </form>

          {/* Quick Demo Credentials helper */}
          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => {
                setEmail('alex@snaplens.app');
                setPassword('SnapLens2026!');
              }}
              className="text-[11px] text-[#FFFC00] hover:underline"
            >
              Fill Demo Credentials
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

