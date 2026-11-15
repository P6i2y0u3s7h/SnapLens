import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, MessageSquare, Sparkles, Compass, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChat } from '../hooks/useChat';
import { useStories } from '../hooks/useStories';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { friends } = useChat();
  const { friendStories } = useStories();

  // Hide bottom nav on camera and editor for full immersion
  const hideOnPaths = ['/camera', '/editor'];
  if (hideOnPaths.some((p) => location.pathname.startsWith(p))) {
    return null;
  }

  const unreadCount = friends.reduce((acc, f) => acc + (f.unreadCount || 0), 0);
  const unseenStories = friendStories.some((s) => s.hasUnseen);

  const navItems = [
    {
      path: '/chat',
      label: 'Chat',
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      path: '/filters',
      label: 'Lenses',
      icon: Sparkles,
    },
    {
      path: '/camera',
      label: 'Camera',
      icon: Camera,
      isCenter: true,
    },
    {
      path: '/stories',
      label: 'Stories',
      icon: PlayCircle,
      hasDot: unseenStories,
    },
    {
      path: '/memories',
      label: 'Memories',
      icon: ImageIcon,
    },
  ];

  return (
    <motion.nav
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0F]/85 backdrop-blur-xl border-t border-white/10 px-2 sm:px-4 py-1.5 safe-bottom"
    >
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="group relative -top-4 sm:-top-5 flex flex-col items-center focus:outline-none"
                aria-label="Open Camera"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full snap-gradient p-[3px] shadow-lg shadow-[#FFFC00]/25 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#0A0A0F] flex items-center justify-center group-hover:bg-[#FFFC00] transition-colors">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#FFFC00] group-hover:text-black transition-colors" />
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-white/70 mt-0.5 group-hover:text-[#FFFC00]">
                  Snap
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center w-14 sm:w-16 py-1 transition-colors duration-200 ${
                isActive ? 'text-[#FFFC00]' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all relative ${isActive ? 'bg-[#FFFC00]/10' : ''}`}>
                <Icon className="w-5 h-5" />

                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FFFC00] text-black text-[9px] font-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}

                {item.hasDot && !item.badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FFFC00] ring-2 ring-[#0A0A0F]" />
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
