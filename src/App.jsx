import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const CameraPage = lazy(() => import('./pages/CameraPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const MemoriesPage = lazy(() => import('./pages/MemoriesPage'));
const FiltersPage = lazy(() => import('./pages/FiltersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StoriesPage = lazy(() => import('./pages/StoriesPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
import BottomNav from './components/BottomNav';

function PageLoader() {
  return (
    <div className="fixed inset-0 bg-[#0A0A0F] z-50 flex flex-col items-center justify-center select-none">
      <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
        <div className="absolute inset-0 rounded-3xl snap-gradient opacity-20 animate-ping" />
        <div className="w-14 h-14 rounded-2xl snap-gradient flex items-center justify-center shadow-lg shadow-[#FFFC00]/25">
          <Camera className="w-7 h-7 text-black animate-pulse" />
        </div>
      </div>
      <span className="text-xs font-bold text-white/50 tracking-widest uppercase">
        SnapLens
      </span>
    </div>
  );
}

function AppContent() {
  const location = useLocation();

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: {
            background: '#141420',
            color: '#ffffff',
            border: '1px solid rgba(255, 252, 0, 0.25)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            fontSize: '13px',
            fontWeight: '600',
            padding: '10px 18px',
            borderRadius: '9999px',
          },
        }}
      />

      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/camera" element={<CameraPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/memories" element={<MemoriesPage />} />
            <Route path="/filters" element={<FiltersPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Fallback route */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </AnimatePresence>
      </Suspense>

      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <AuthModal />
      </AuthProvider>
    </BrowserRouter>
  );
}
