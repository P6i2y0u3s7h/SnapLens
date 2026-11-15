import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Camera, ArrowRight, Check, Sliders, Play } from 'lucide-react';
import Header from '../components/Header';
import { FILTERS } from '../hooks/useCamera';
import { AR_FILTERS } from '../utils/arFilterEngine';

export default function FiltersPage() {
  const navigate = useNavigate();
  const [selectedPreview, setSelectedPreview] = useState(FILTERS[0]);

  const sampleImages = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
  ];

  const [currentSampleImgIdx, setCurrentSampleImgIdx] = useState(0);

  const handleLaunchFilter = (filter) => {
    navigate('/camera', { state: { preselectedFilterId: filter.id } });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-28">
      <Header />

      <main className="max-w-7xl mx-auto pt-24 px-4 sm:px-6">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-xs font-bold text-[#FFFC00] mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#FFFC00]" />
            <span>Interactive Lens Gallery</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Explore Live Shaders & Lenses
          </h1>
          <p className="text-white/50 text-base">
            Every filter is computed live using GPU shaders directly on your camera stream.
            Preview them below and tap to test in real-time.
          </p>
        </div>

        {/* Interactive Feature Hero Previewer */}
        <section className="glass-panel rounded-3xl p-6 sm:p-10 mb-16 border border-white/10 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Filter Details */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFC00]/15 text-[#FFFC00] text-xs font-bold mb-4">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedPreview.color }} />
                <span>Selected Shader</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black mb-3">
                {selectedPreview.name}
              </h2>
              <p className="text-white/60 text-base leading-relaxed mb-6">
                {selectedPreview.description}
              </p>

              {/* Sample switcher */}
              <div className="mb-8">
                <span className="text-xs font-semibold text-white/40 block mb-2">Switch Model Preview:</span>
                <div className="flex gap-2">
                  {sampleImages.map((img, i) => (
                    <button
                      key={img}
                      onClick={() => setCurrentSampleImgIdx(i)}
                      className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-transform ${
                        currentSampleImgIdx === i ? 'border-[#FFFC00] scale-105' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Launch in Camera Button */}
              <button
                onClick={() => handleLaunchFilter(selectedPreview)}
                className="btn-snap px-8 py-3.5 text-sm font-bold flex items-center gap-3 shadow-xl shadow-[#FFFC00]/20"
              >
                <Camera className="w-5 h-5 text-black" />
                <span>Try Live in Camera</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Right: Big Interactive Preview Card */}
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-black">
              <img
                src={sampleImages[currentSampleImgIdx]}
                alt="Filter preview"
                className="w-full h-full object-cover transition-all duration-300"
                style={{
                  filter: selectedPreview.css !== 'none' ? selectedPreview.css : undefined,
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-lg"
                      style={{ backgroundColor: selectedPreview.color }}
                    />
                    <span className="font-extrabold text-sm text-white drop-shadow-md">
                      {selectedPreview.name}
                    </span>
                  </div>
                  <span className="text-xs text-white/60 font-mono">100% GPU Accelerated</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* All Filters Grid */}
        <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#FFFC00]" />
          <span>All 10 Real-Time Camera Shaders</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-16">
          {FILTERS.map((f, i) => {
            const isSelected = selectedPreview.id === f.id;
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedPreview(f)}
                className={`glass-panel rounded-2xl p-3 cursor-pointer border transition-all duration-300 group flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#FFFC00] shadow-lg shadow-[#FFFC00]/15 scale-102 bg-[#FFFC00]/5'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3 bg-black">
                  <img
                    src={sampleImages[0]}
                    alt={f.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ filter: f.css !== 'none' ? f.css : undefined }}
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shadow-md"
                      style={{ backgroundColor: f.color }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#FFFC00] transition-colors mb-0.5">
                    {f.name}
                  </h3>
                  <p className="text-[11px] text-white/50 line-clamp-1 mb-2">
                    {f.description}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchFilter(f);
                  }}
                  className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-[#FFFC00] hover:text-black text-white/70 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3 h-3" />
                  <span>Use Filter</span>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* AR Face Lenses Showcase */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFFC00]" />
            <span>Interactive AR Face Lenses ({AR_FILTERS.length})</span>
          </h2>
          <span className="text-xs text-white/50">MediaPipe & Neural Face Tracking Enabled</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {AR_FILTERS.map((lens, i) => (
            <motion.div
              key={lens.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate('/camera', { state: { preselectedArFilterId: lens.id } })}
              className="glass-panel rounded-2xl p-4 text-center cursor-pointer border border-white/10 hover:border-[#FFFC00] hover:shadow-lg hover:shadow-[#FFFC00]/15 transition-all group flex flex-col justify-between"
            >
              <div>
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner group-hover:scale-110 transition-transform"
                  style={{ background: lens.gradient || 'rgba(255,255,255,0.08)' }}
                >
                  {lens.icon}
                </div>
                <div className="inline-block px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-wider">
                  {lens.category}
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#FFFC00] transition-colors mb-1">
                  {lens.name}
                </h3>
                <p className="text-[11px] text-white/50 line-clamp-2 mb-3">
                  {lens.desc}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/camera', { state: { preselectedArFilterId: lens.id } });
                }}
                className="w-full py-2 rounded-xl bg-[#FFFC00]/10 hover:bg-[#FFFC00] hover:text-black text-[#FFFC00] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Try Lens</span>
              </button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}

