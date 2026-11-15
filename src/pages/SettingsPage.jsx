import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Sliders,
  HardDrive,
  Trash2,
  Info,
  Shield,
  ArrowLeft,
  Check,
  RefreshCw,
  Volume2,
  Maximize,
  Sparkles
} from 'lucide-react';
import Header from '../components/Header';
import { useMemories } from '../hooks/useMemories';
import { isSoundMuted, setSoundMuted } from '../utils/audioUtils';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { memories, clearAllMemories } = useMemories();

  // Settings state stored in localStorage
  const [resolution, setResolution] = useState(
    () => localStorage.getItem('snaplens_pref_res') || '1080p'
  );
  const [defaultMode, setDefaultMode] = useState(
    () => localStorage.getItem('snaplens_pref_mode') || 'photo'
  );
  const [defaultLens, setDefaultLens] = useState(
    () => localStorage.getItem('snaplens_pref_lens') || 'user'
  );
  const [audioEnabled, setAudioEnabled] = useState(
    () => localStorage.getItem('snaplens_pref_audio') !== 'false'
  );
  const [isSoundEffectsEnabled, setIsSoundEffectsEnabled] = useState(
    () => !isSoundMuted()
  );

  const savePref = (key, value, setter) => {
    setter(value);
    localStorage.setItem(key, value);
    toast.success('Preference updated');
  };

  const handleClearMemories = () => {
    if (window.confirm('Are you sure you want to delete all saved memories? This action cannot be reversed.')) {
      clearAllMemories();
      toast.success('All memories have been deleted.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-28">
      <Header />

      <main className="max-w-3xl mx-auto pt-24 px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full glass-pill flex items-center justify-center text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Settings</h1>
            <p className="text-white/50 text-xs">Configure your camera, audio, and storage preferences.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section: Camera Configuration */}
          <section className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#FFFC00] mb-5 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Camera Stream Preferences</span>
            </h2>

            <div className="space-y-5">
              {/* Resolution */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white">Stream Target Resolution</h3>
                  <p className="text-xs text-white/40">Hardware capture stream quality.</p>
                </div>
                <div className="flex gap-2">
                  {['1080p', '720p'].map((res) => (
                    <button
                      key={res}
                      onClick={() => savePref('snaplens_pref_res', res, setResolution)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        resolution === res
                          ? 'bg-[#FFFC00] text-black shadow-md'
                          : 'glass-pill text-white/60 hover:text-white'
                      }`}
                    >
                      {res} {res === '1080p' ? '(FHD)' : '(HD)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Lens */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white">Default Camera Lens</h3>
                  <p className="text-xs text-white/40">Initial lens facing mode on camera launch.</p>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: 'user', label: 'Front (Selfie)' },
                    { id: 'environment', label: 'Rear (World)' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => savePref('snaplens_pref_lens', l.id, setDefaultLens)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        defaultLens === l.id
                          ? 'bg-[#FFFC00] text-black shadow-md'
                          : 'glass-pill text-white/60 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Shutter Mode */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white">Default Shutter Mode</h3>
                  <p className="text-xs text-white/40">Initial camera mode on app startup.</p>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: 'photo', label: 'Photo' },
                    { id: 'video', label: 'Video' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => savePref('snaplens_pref_mode', m.id, setDefaultMode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        defaultMode === m.id
                          ? 'bg-[#FFFC00] text-black shadow-md'
                          : 'glass-pill text-white/60 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Video Audio Recording</h3>
                  <p className="text-xs text-white/40">Enable microphone audio track during video recording.</p>
                </div>
                <button
                  onClick={() => {
                    const next = !audioEnabled;
                    setAudioEnabled(next);
                    localStorage.setItem('snaplens_pref_audio', String(next));
                    toast.success(`Audio ${next ? 'enabled' : 'disabled'}`);
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    audioEnabled ? 'bg-[#FFFC00]' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transition-transform ${
                      audioEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Camera Sound Effects Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white">Camera Sound Effects</h3>
                  <p className="text-xs text-white/40">Shutter click, video record chimes, lens flip, and mode sounds.</p>
                </div>
                <button
                  onClick={() => {
                    const nextMuted = isSoundEffectsEnabled; // if currently enabled, next is muted
                    setSoundMuted(nextMuted);
                    setIsSoundEffectsEnabled(!nextMuted);
                    toast.success(`Camera sounds ${!nextMuted ? 'enabled' : 'muted'}`);
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    isSoundEffectsEnabled ? 'bg-[#FFFC00]' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transition-transform ${
                      isSoundEffectsEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Section: Storage & Cache */}
          <section className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#FFFC00] mb-5 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              <span>Memories & Device Storage</span>
            </h2>

            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white">Saved Snaps</h3>
                <p className="text-xs text-white/40">Total items stored in IndexedDB.</p>
              </div>
              <span className="text-sm font-black text-white font-mono">{memories.length} items</span>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                <h3 className="text-sm font-bold text-red-400">Clear All Memories</h3>
                <p className="text-xs text-white/40">Permanently delete all stored photos & videos.</p>
              </div>
              <button
                onClick={handleClearMemories}
                disabled={memories.length === 0}
                className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All</span>
              </button>
            </div>
          </section>

          {/* Section: About SnapLens */}
          <section className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#FFFC00] mb-5 flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>About SnapLens</span>
            </h2>

            <div className="space-y-3 text-xs text-white/60">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Version</span>
                <span className="font-mono text-white font-bold">1.0.0 PRO</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Frontend Framework</span>
                <span className="text-white font-medium">React 18 + Vite 6</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Design System</span>
                <span className="text-white font-medium">Tailwind CSS + Glassmorphism</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Media APIs</span>
                <span className="text-white font-medium">MediaDevices, MediaRecorder, Canvas 2D</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Storage Mechanism</span>
                <span className="text-white font-medium">Local IndexedDB & localStorage</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

