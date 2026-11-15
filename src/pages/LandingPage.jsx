import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Camera,
  Sparkles,
  Film,
  Image as ImageIcon,
  Sliders,
  Zap,
  ArrowRight,
  Play,
  Layers,
  Shield,
  Smile,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Heart,
  MessageSquare,
  PlayCircle
} from 'lucide-react';
import Header from '../components/Header';
import { FILTERS } from '../hooks/useCamera';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { currentUser, setIsAuthModalOpen } = useAuth();
  const [demoFilterIdx, setDemoFilterIdx] = useState(0);
  const heroRef = useRef(null);

  const handleLaunchFeature = (route) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    navigate(route);
  };

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const activeDemoFilter = FILTERS[demoFilterIdx] || FILTERS[0];

  const features = [
    {
      icon: Camera,
      title: 'Full-Screen Live Camera',
      description: 'Ultra-low latency HD camera streaming with instant front/rear lens switching, torch control, and smart zoom.',
      badge: 'Core Feature',
      route: '/camera',
    },
    {
      icon: Sparkles,
      title: 'Real-Time Filters',
      description: '10 custom color grading shaders including Vintage, Cinematic, B&W, Warm Sunset, and Soft Glow previewed live.',
      badge: 'Live Shaders',
      route: '/filters',
    },
    {
      icon: PlayCircle,
      title: 'Ephemeral Stories',
      description: 'Publish 24-hour video and photo updates with segment timer bars, friend updates, and interactive reactions.',
      badge: 'Stories',
      route: '/stories',
    },
    {
      icon: MessageSquare,
      title: 'Live Chat & Streaks',
      description: 'Maintain snap streaks 🔥, send disappearing photos/videos, and direct message friends with unread status indicators.',
      badge: 'Social',
      route: '/chat',
    },
    {
      icon: ImageIcon,
      title: 'Creative Studio Editor',
      description: 'Draw freehand with variable brush sizes, overlay custom text captions, and stamp vibrant emojis on your snaps.',
      badge: 'Built-in',
      route: '/editor',
    },
    {
      icon: Layers,
      title: 'Memories Cloud Gallery',
      description: 'Organize your moments into date-categorized albums with full-screen playback, instant download, and sharing.',
      badge: 'Storage',
      route: '/memories',
    },
  ];

  const demoThumbnails = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80',
  ];

  return (
    <div className="min-h-dvh bg-[#0A0A0F] text-white overflow-x-hidden pb-24">
      <Header />

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative pt-20 sm:pt-28 md:pt-32 pb-16 sm:pb-20 px-3 sm:px-6 max-w-7xl mx-auto flex flex-col items-center text-center"
      >
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[550px] h-[300px] sm:h-[550px] bg-[#FFFC00]/6 rounded-full blur-[90px] sm:blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[250px] sm:w-[350px] h-[250px] sm:h-[350px] bg-yellow-500/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full glass-pill text-xs font-semibold text-[#FFFC00] mb-6 sm:mb-8 border border-[#FFFC00]/25 shadow-lg shadow-[#FFFC00]/5"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FFFC00]" />
          <span>Next-Generation Camera & Social Platform</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFFC00] animate-ping" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl xs:text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.08] max-w-5xl mb-5 sm:mb-6"
        >
          Capture Every <br />
          <span className="snap-yellow-text drop-shadow-[0_0_35px_rgba(255,252,0,0.3)]">
            Moment.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-xl md:text-2xl text-white/60 max-w-2xl mx-auto font-normal leading-relaxed mb-8 sm:mb-10 px-2"
        >
          Your world. Your moments. Your creativity.
          <br className="hidden sm:inline" />
          Live lenses, beauty tuning, disappearing stories, and instant chat.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto mb-12 sm:mb-16 px-4"
        >
          <button
            onClick={() => handleLaunchFeature('/camera')}
            className="w-full sm:w-auto btn-snap px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 group shadow-xl shadow-[#FFFC00]/25"
          >
            <Camera className="w-5 h-5 text-black group-hover:rotate-12 transition-transform" />
            <span>Open Camera</span>
            <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => handleLaunchFeature('/stories')}
            className="w-full sm:w-auto glass-pill px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold flex items-center justify-center gap-2.5 text-white"
          >
            <PlayCircle className="w-5 h-5 text-[#FFFC00]" />
            <span>Watch Stories</span>
          </button>
        </motion.div>

        {/* Interactive Mockup Phone with live filter switcher */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: 'spring' }}
          className="relative w-full max-w-[280px] xs:max-w-xs sm:max-w-md mx-auto"
        >
          {/* Ambient rim glow */}
          <div className="absolute -inset-1.5 snap-gradient rounded-[3rem] blur-xl opacity-30 animate-pulse-glow" />

          {/* Phone Shell */}
          <div className="relative rounded-[2.8rem] bg-[#0E0E17] border-4 border-white/15 p-2.5 sm:p-3 shadow-2xl shadow-black overflow-hidden">
            {/* Camera Cutout */}
            <div className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 w-24 sm:w-28 h-5 sm:h-6 bg-black rounded-full z-30 flex items-center justify-between px-3">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-blue-950/80 border border-blue-500/30" />
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-500/70" />
            </div>

            {/* Viewfinder Screen */}
            <div className="relative aspect-[9/16] rounded-[2.2rem] overflow-hidden bg-black flex flex-col justify-between p-3.5 sm:p-4">
              {/* Background Mock Viewfinder Image with dynamic CSS filter */}
              <img
                src={demoThumbnails[demoFilterIdx % demoThumbnails.length]}
                alt="Camera sample"
                className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
                style={{
                  filter: activeDemoFilter.css !== 'none' ? activeDemoFilter.css : undefined,
                }}
              />

              {/* Viewfinder Top Bar Overlay */}
              <div className="relative z-10 flex items-center justify-between pt-6 sm:pt-8 text-white">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] font-semibold text-[#FFFC00]">
                  <Sparkles className="w-3 h-3 text-[#FFFC00]" />
                  <span>{activeDemoFilter.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                    <Zap className="w-3 h-3 text-white/80" />
                  </div>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                    <RefreshCw className="w-3 h-3 text-white/80" />
                  </div>
                </div>
              </div>

              {/* Viewfinder Bottom Controls Overlay */}
              <div className="relative z-10 flex flex-col items-center gap-2.5">
                {/* Mini Filter Pills Carousel */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full no-scrollbar justify-center py-1">
                  {FILTERS.slice(0, 4).map((f, i) => (
                    <button
                      key={f.id}
                      onClick={() => setDemoFilterIdx(i)}
                      className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-tight backdrop-blur-md transition-all ${
                        demoFilterIdx === i
                          ? 'bg-[#FFFC00] text-black shadow-lg shadow-[#FFFC00]/40 scale-105'
                          : 'bg-black/50 text-white/80 border border-white/10'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>

                {/* Shutter row */}
                <div className="flex items-center justify-between w-full px-2 pt-0.5">
                  <div 
                    onClick={() => handleLaunchFeature('/memories')} 
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>

                  <div 
                    onClick={() => handleLaunchFeature('/camera')} 
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  >
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-[#FFFC00] transition-colors" />
                  </div>

                  <div 
                    onClick={() => setDemoFilterIdx((p) => (p + 1) % FILTERS.length)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center cursor-pointer"
                    title="Next Lens"
                  >
                    <Sparkles className="w-4 h-4 text-[#FFFC00]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Live Metrics Banner */}
      <section className="border-y border-white/8 bg-[#0D0D1A]/60 py-10 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
          {[
            { value: '10+', label: 'Real-Time Lenses', sub: 'Instant GPU shaders' },
            { value: '1080p', label: 'Full HD Quality', sub: 'Native resolution stream' },
            { value: '24h', label: 'Ephemeral Stories', sub: 'Disappearing timeline' },
            { value: '100%', label: 'Device Safe & Private', sub: 'IndexedDB local engine' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-[#FFFC00] tracking-tight mb-1">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-white mb-0.5">{stat.label}</div>
              <div className="text-[10px] sm:text-xs text-white/40">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FFFC00] px-3 py-1 rounded-full bg-[#FFFC00]/10 border border-[#FFFC00]/20 inline-block mb-3">
            Engineered For Creators
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Everything you need for creative capture.
          </h2>
          <p className="text-white/50 text-sm sm:text-base">
            No lag, no complex setup. Access studio-quality camera tools and social features right from your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ y: -6 }}
                onClick={() => handleLaunchFeature(feature.route)}
                className="glass-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between group hover:border-[#FFFC00]/30 transition-all duration-300 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFFC00]/10 border border-[#FFFC00]/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FFFC00] transition-all duration-300">
                      <Icon className="w-6 h-6 text-[#FFFC00] group-hover:text-black transition-colors" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-2.5 py-1 rounded-lg">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-white group-hover:text-[#FFFC00] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-white/5 flex items-center gap-1.5 text-xs font-semibold text-[#FFFC00] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Open Feature</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 bg-[#0D0D1A]/50 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#FFFC00] px-3 py-1 rounded-full bg-[#FFFC00]/10 border border-[#FFFC00]/20 inline-block mb-3">
              Frictionless Flow
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              How SnapLens Works
            </h2>
            <p className="text-white/50 text-sm sm:text-base">
              From live viewfinder to finished creative snap and story in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {[
              {
                step: '01',
                title: 'Grant Access',
                desc: 'One-click permission grants hardware access to your camera and microphone.',
              },
              {
                step: '02',
                title: 'Select Lens',
                desc: 'Browse 10 real-time shaders and tune skin smoothing or brightness.',
              },
              {
                step: '03',
                title: 'Snap or Record',
                desc: 'Tap shutter for high-res photo or hold/toggle to record fluid video.',
              },
              {
                step: '04',
                title: 'Post Story or Send',
                desc: 'Add captions, emojis, freehand drawings, then share to Story or Chat.',
              },
            ].map((st, idx) => (
              <motion.div
                key={st.step}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="glass-panel rounded-3xl p-6 relative overflow-hidden"
              >
                <div className="text-3xl sm:text-4xl font-black text-[#FFFC00]/20 mb-3 font-mono">
                  {st.step}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">{st.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{st.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Big Action CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="relative rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-14 overflow-hidden border border-white/10 bg-gradient-to-br from-[#161625] via-[#0E0E18] to-[#0A0A0F] text-center shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFFC00]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl mx-auto mb-5 sm:mb-6 shadow-xl shadow-[#FFFC00]/25 overflow-hidden border border-white/20">
              <img src="/logo.png" alt="SnapLens Logo" className="w-full h-full object-cover" />
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
              Ready to create your first snap?
            </h2>

            <p className="text-white/60 text-sm sm:text-base mb-8">
              Experience the full Snapchat-style camera live in your browser right now.
            </p>

            <button
              onClick={() => handleLaunchFeature('/camera')}
              className="btn-snap px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-bold inline-flex items-center gap-3 shadow-xl shadow-[#FFFC00]/30 hover:scale-105 transition-transform"
            >
              <Camera className="w-5 h-5 text-black" />
              <span>Launch Camera</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 pt-8 pb-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 text-xs text-white/40">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SnapLens Logo" className="w-6 h-6 rounded-lg object-cover" />
            <span className="font-extrabold text-sm text-white">SnapLens</span>
            <span>— Premium Camera Web Experience</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs">
            <button onClick={() => handleLaunchFeature('/stories')} className="hover:text-white transition-colors">Stories</button>
            <button onClick={() => handleLaunchFeature('/chat')} className="hover:text-white transition-colors">Chat</button>
            <button onClick={() => handleLaunchFeature('/filters')} className="hover:text-white transition-colors">Lenses</button>
            <button onClick={() => handleLaunchFeature('/memories')} className="hover:text-white transition-colors">Memories</button>
            <button onClick={() => handleLaunchFeature('/profile')} className="hover:text-white transition-colors">Profile</button>
            <button onClick={() => handleLaunchFeature('/settings')} className="hover:text-white transition-colors">Settings</button>
          </div>

          <div className="text-[11px] text-center sm:text-right">
            MediaDevices, WebGL Shaders & Canvas 2D.
          </div>
        </div>
      </footer>
    </div>
  );
}
