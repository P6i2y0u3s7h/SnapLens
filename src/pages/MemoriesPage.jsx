import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Trash2,
  Download,
  Share2,
  Heart,
  Calendar,
  Grid,
  List,
  Play,
  Film,
  Image as ImageIcon,
  Sparkles,
  X,
  Search,
  Filter,
  ArrowLeft,
  Cloud
} from 'lucide-react';
import Header from '../components/Header';
import { useMemories } from '../hooks/useMemories';
import toast from 'react-hot-toast';

export default function MemoriesPage() {
  const navigate = useNavigate();
  const {
    memories,
    isLoading,
    deleteMemory,
    downloadMemory,
    toggleFavorite,
    clearAllMemories,
  } = useMemories();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'photos' | 'videos' | 'favorites'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedItem, setSelectedItem] = useState(null); // lightbox
  const [searchQuery, setSearchQuery] = useState('');

  // Filter memories
  const filteredMemories = useMemo(() => {
    return memories.filter((item) => {
      if (activeTab === 'photos' && item.type !== 'photo') return false;
      if (activeTab === 'videos' && item.type !== 'video') return false;
      if (activeTab === 'favorites' && !item.favorite) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesFilter = item.filter?.toLowerCase().includes(query);
        return matchesTitle || matchesFilter;
      }
      return true;
    });
  }, [memories, activeTab, searchQuery]);

  // Group by relative date (Today, Yesterday, This Month, Older)
  const groupedSections = useMemo(() => {
    const groups = {};
    const now = new Date();
    const todayStr = now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredMemories.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      const dateStr = itemDate.toDateString();

      let label = 'Older';
      if (dateStr === todayStr) {
        label = 'Today';
      } else if (dateStr === yesterdayStr) {
        label = 'Yesterday';
      } else if (now.getMonth() === itemDate.getMonth() && now.getFullYear() === itemDate.getFullYear()) {
        label = 'This Month';
      } else {
        label = itemDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return groups;
  }, [filteredMemories]);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    deleteMemory(id);
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
    toast.success('Snap deleted.');
  };

  const handleDownload = (item, e) => {
    e.stopPropagation();
    downloadMemory(item);
    toast.success('Downloading media...');
  };

  const handleFavorite = (id, e) => {
    e.stopPropagation();
    toggleFavorite(id);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-28">
      <Header />

      <main className="max-w-6xl mx-auto pt-24 px-4 sm:px-6">
        {/* Title & Quick Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Memories</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFFC00]/15 text-[#FFFC00] border border-[#FFFC00]/30">
                {memories.length} Snaps
              </span>
            </div>
            <p className="text-white/50 text-sm mt-1">
              All your captured moments and edited snaps saved securely on your device.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* View switcher */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-colors ${
                  viewMode === 'grid' ? 'bg-[#FFFC00] text-black shadow-md' : 'text-white/50 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-colors ${
                  viewMode === 'list' ? 'bg-[#FFFC00] text-black shadow-md' : 'text-white/50 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => navigate('/camera')}
              className="btn-snap px-5 py-2.5 text-xs font-bold flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-black" />
              <span>New Snap</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', label: 'All Snaps', count: memories.length },
              { id: 'photos', label: 'Photos', count: memories.filter((m) => m.type === 'photo').length },
              { id: 'videos', label: 'Videos', count: memories.filter((m) => m.type === 'video').length },
              { id: 'favorites', label: 'Favorites', count: memories.filter((m) => m.favorite).length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#FFFC00] text-black shadow-lg shadow-[#FFFC00]/20'
                    : 'glass-pill text-white/60 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search lens or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFFC00]"
            />
          </div>
        </div>

        {/* Empty State */}
        {filteredMemories.length === 0 && !isLoading && (
          <div className="glass-panel rounded-3xl p-16 text-center max-w-lg mx-auto border border-white/10 my-10">
            <div className="w-20 h-20 rounded-3xl bg-[#FFFC00]/10 border border-[#FFFC00]/25 flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 text-[#FFFC00]" />
            </div>

            <h3 className="text-xl font-bold mb-2">No Moments Captured Yet</h3>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              Open your camera, try on lenses, and snap photos or record videos to start your Memories roll.
            </p>

            <button
              onClick={() => navigate('/camera')}
              className="btn-snap px-8 py-3.5 text-sm font-bold inline-flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-black" />
              <span>Launch Camera</span>
            </button>
          </div>
        )}

        {/* Grouped Memories Display */}
        {Object.entries(groupedSections).map(([groupTitle, items]) => (
          <section key={groupTitle} className="mb-12">
            <div className="flex items-center gap-2.5 mb-4">
              <Calendar className="w-4 h-4 text-[#FFFC00]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white/80">
                {groupTitle}
              </h2>
              <span className="text-xs text-white/30">({items.length})</span>
            </div>

            {viewMode === 'grid' ? (
              /* Grid Layout */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedItem(item)}
                    className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-black/60 border border-white/10 cursor-pointer shadow-md hover:border-[#FFFC00]/40 transition-all duration-300"
                  >
                    {item.type === 'video' ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-gray-950">
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.dataUrl || item.url}
                        alt="Snap"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-70 group-hover:opacity-90 transition-opacity" />

                    {/* Top tags */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs z-10">
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-semibold text-[#FFFC00] border border-white/10">
                          {item.filter || 'Lens'}
                        </span>
                        {item.isCloudSynced && (
                          <span
                            className="px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold flex items-center gap-1 backdrop-blur-md"
                            title="Synced to Firebase Cloud"
                          >
                            <Cloud className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleFavorite(item.id, e)}
                        className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            item.favorite ? 'text-red-500 fill-current' : 'text-white/70'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Bottom details & quick actions */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs z-10">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-white/80">
                        {item.type === 'video' ? (
                          <Film className="w-3.5 h-3.5 text-[#FFFC00]" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-[#FFFC00]" />
                        )}
                        <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDownload(item, e)}
                          className="w-7 h-7 rounded-lg glass-pill flex items-center justify-center hover:scale-110 active:scale-95"
                          title="Download"
                        >
                          <Download className="w-3 h-3 text-white" />
                        </button>

                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="w-7 h-7 rounded-lg bg-red-600/80 hover:bg-red-600 flex items-center justify-center hover:scale-110 active:scale-95"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* List Layout */
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="glass-panel rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-[#FFFC00]/30 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0">
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-900">
                            <Play className="w-5 h-5 text-white fill-current" />
                          </div>
                        ) : (
                          <img
                            src={item.dataUrl || item.url}
                            alt="Snap thumbnail"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm text-white truncate">
                            {item.title || 'Snap Lens Moment'}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-[#FFFC00]/15 text-[#FFFC00] text-[10px] font-semibold">
                            {item.filter || 'Original'}
                          </span>
                        </div>
                        <p className="text-xs text-white/50">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleFavorite(item.id, e)}
                        className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center"
                      >
                        <Heart
                          className={`w-4 h-4 ${item.favorite ? 'text-red-500 fill-current' : 'text-white/60'}`}
                        />
                      </button>

                      <button
                        onClick={(e) => handleDownload(item, e)}
                        className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center"
                      >
                        <Download className="w-4 h-4 text-white/80" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="w-9 h-9 rounded-xl glass-pill text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </main>

      {/* Lightbox Modal View */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-lg w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full glass-pill flex items-center justify-center text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Media Content */}
              <div className="w-full rounded-3xl overflow-hidden border border-white/15 bg-black shadow-2xl flex items-center justify-center">
                {selectedItem.type === 'video' ? (
                  <video
                    src={selectedItem.url}
                    controls
                    autoPlay
                    className="max-h-[70vh] w-full rounded-3xl object-contain"
                  />
                ) : (
                  <img
                    src={selectedItem.dataUrl || selectedItem.url}
                    alt="Expanded Snap"
                    className="max-h-[70vh] w-full object-contain rounded-3xl"
                  />
                )}
              </div>

              {/* Action Toolbar */}
              <div className="w-full mt-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => downloadMemory(selectedItem)}
                  className="flex-1 btn-snap py-3 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-black" />
                  <span>Download Media</span>
                </button>

                <button
                  onClick={() => {
                    toggleFavorite(selectedItem.id);
                    setSelectedItem((prev) => ({ ...prev, favorite: !prev.favorite }));
                  }}
                  className={`px-4 py-3 rounded-2xl glass-pill flex items-center gap-2 text-xs font-semibold ${
                    selectedItem.favorite ? 'text-red-500' : 'text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${selectedItem.favorite ? 'fill-current' : ''}`} />
                  <span>{selectedItem.favorite ? 'Favorited' : 'Favorite'}</span>
                </button>

                <button
                  onClick={() => {
                    deleteMemory(selectedItem.id);
                    setSelectedItem(null);
                    toast.success('Snap deleted.');
                  }}
                  className="px-4 py-3 rounded-2xl bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs font-semibold flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

