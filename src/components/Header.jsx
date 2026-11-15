import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, Sparkles, Image, Settings, User, MessageSquare, PlayCircle, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, setIsAuthModalOpen } = useAuth();

  const links = [
    { path: '/', label: 'Explore' },
    { path: '/stories', label: 'Stories' },
    { path: '/chat', label: 'Chat' },
    { path: '/filters', label: 'Lenses' },
    { path: '/memories', label: 'Memories' },
  ];

  const handleNav = (path) => {
    if (path === '/') {
      navigate('/');
      return;
    }
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    navigate(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#0A0A0F]/85 backdrop-blur-md border-b border-white/8 h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Brand logo */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <img
            src="/logo.png"
            alt="SnapLens Logo"
            className="w-9 h-9 rounded-2xl object-cover shadow-md shadow-[#FFFC00]/25 group-hover:scale-105 transition-transform border border-white/10"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-tight text-white">
              SnapLens
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#FFFC00]/15 text-[#FFFC00] border border-[#FFFC00]/30 hidden xs:inline">
              PRO
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'text-[#FFFC00] bg-white/5 font-bold shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center overflow-hidden border border-white/20 hover:border-[#FFFC00] transition-colors"
              title="Profile"
            >
              {userProfile?.photoURL || currentUser?.photoURL ? (
                <img
                  src={userProfile?.photoURL || currentUser?.photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-[#FFFC00]" />
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="glass-pill px-3 py-1.5 text-xs font-bold text-white hover:text-[#FFFC00] flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-[#FFFC00]" />
              <span>Sign In</span>
            </button>
          )}

          <button
            onClick={() => handleNav('/settings')}
            className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center text-white/70 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Shown on desktop website, hidden on mobile */}
          <button
            onClick={() => handleNav('/camera')}
            className="hidden md:flex btn-snap px-4 py-2 text-xs font-bold items-center gap-2 group shadow-md shadow-[#FFFC00]/20"
          >
            <Camera className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
            <span>Camera</span>
          </button>
        </div>
      </div>
    </header>
  );
}
