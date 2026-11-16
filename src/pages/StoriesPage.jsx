import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Camera,
  Plus,
  Play,
  Eye,
  Trash2,
  ChevronRight,
  TrendingUp,
  Compass,
  Upload,
  Clock,
  Cloud,
  X,
  Film
} from 'lucide-react';
import Header from '../components/Header';
import StoryViewerModal from '../components/StoryViewerModal';
import { useStories } from '../hooks/useStories';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function StoriesPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const {
    myStories,
    friendStories,
    isCloudSyncing,
    addSnapToMyStory,
    deleteFromMyStory,
    markStoryAsSeen,
  } = useStories();

  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleOpenMyStory = () => {
    if (myStories.length > 0) {
      setActiveStoryGroup({
        id: currentUser?.uid || 'mystory',
        user: {
          id: currentUser?.uid || 'mystory',
          name: userProfile?.displayName || currentUser?.displayName || 'My Story',
          handle: userProfile?.handle || 'you',
          avatar:
            userProfile?.photoURL ||
            currentUser?.photoURL ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.uid || 'you'}`,
        },
        items: myStories.map((s) => ({
          ...s,
          mediaUrl: s.mediaUrl || s.url,
          url: s.mediaUrl || s.url,
          mediaType: s.mediaType || (s.type === 'video' ? 'video' : 'image'),
          type: (s.mediaType === 'video' || s.type === 'video') ? 'video' : 'photo',
        })),
      });
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleOpenFriendStory = (story) => {
    setActiveStoryGroup(story);
  };

  const handleStoryViewed = (storyId, friendId) => {
    markStoryAsSeen(storyId, friendId);
  };

  // Direct file upload to story (photo or video)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const isImage = file.type.startsWith('image');
    if (!isVideo && !isImage) {
      toast.error('Please upload an image or video file.');
      return;
    }

    const toastId = toast.loading('Adding to My Story...');
    try {
      const url = URL.createObjectURL(file);
      await addSnapToMyStory({
        type: isVideo ? 'video' : 'photo',
        url,
        fileBlob: file,
        caption: isVideo ? 'Video Story Moment' : 'Photo Story Moment',
        filter: 'Original',
        duration: isVideo ? 10 : 5,
      });
      toast.success(isVideo ? 'Video added to My Story! (24h)' : 'Photo added to My Story! (24h)', { id: toastId, icon: '✨' });
    } catch {
      toast.error('Failed to add to story', { id: toastId });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const discoverStories = [
    {
      id: 'disc_1',
      creator: 'Cosmic Vibes',
      title: 'Neon Nights in Tokyo 🗼',
      views: '124K',
      image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'disc_2',
      creator: 'Lens Master Pro',
      title: 'Top 5 Golden Hour Shaders ✨',
      views: '89K',
      image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'disc_3',
      creator: 'Wanderlust Moments',
      title: 'Exploring the Swiss Alps 🏔️',
      views: '240K',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'disc_4',
      creator: 'Studio Beats',
      title: 'Behind the Scenes Album Drop 🎧',
      views: '54K',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <div className="min-h-dvh bg-[#0A0A0F] text-white pb-28">
      <Header />

      {/* Hidden File Input for uploading media directly to stories */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <main className="max-w-5xl mx-auto pt-24 px-4 sm:px-6">
        {/* Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-2.5">
              <span>Stories</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFFC00] animate-pulse" />
              {isCloudSyncing && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 font-mono">
                  <Cloud className="w-3 h-3 animate-spin" />
                  <span>Syncing</span>
                </span>
              )}
            </h1>
            <p className="text-white/50 text-xs sm:text-sm mt-1">
              Watch friends’ updates and publish 24-hour ephemeral photos & videos.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="glass-pill px-4 py-2 text-xs font-bold text-white flex items-center gap-2 hover:bg-white/15"
              title="Upload photo or video to story"
            >
              <Upload className="w-4 h-4 text-[#FFFC00]" />
              <span>Upload Story</span>
            </button>
            <button
              onClick={() => navigate('/camera')}
              className="btn-snap px-4 py-2 text-xs font-bold flex items-center gap-2 text-black"
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </button>
          </div>
        </div>

        {/* My Story Card Banner */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 mb-10 flex flex-col sm:flex-row items-center justify-between gap-5 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* Story avatar / thumbnail */}
            <div
              onClick={handleOpenMyStory}
              className={`relative w-16 h-16 rounded-full p-[3px] cursor-pointer flex-shrink-0 transition-transform hover:scale-105 active:scale-95 ${
                myStories.length > 0 ? 'snap-gradient shadow-lg shadow-[#FFFC00]/20' : 'bg-white/15'
              }`}
            >
              <div className="w-full h-full rounded-full bg-[#0A0A0F] overflow-hidden flex items-center justify-center">
                {myStories.length > 0 ? (
                  myStories[0].type === 'video' ? (
                    <div className="relative w-full h-full">
                      <video src={myStories[0].url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Film className="w-4 h-4 text-[#FFFC00]" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={myStories[0].url}
                      alt="My Story"
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <Camera className="w-6 h-6 text-[#FFFC00]" />
                )}
              </div>

              {myStories.length === 0 && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FFFC00] text-black flex items-center justify-center font-bold shadow-md">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">My Story</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  24h Ephemeral
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                {myStories.length > 0
                  ? `${myStories.length} active ${myStories.length === 1 ? 'moment' : 'moments'} • Tap circle to view`
                  : 'Share your day with friends (expires after 24 hours)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {myStories.length > 0 ? (
              <>
                <button
                  onClick={() => setShowManageModal(true)}
                  className="glass-pill px-4 py-2.5 text-xs font-semibold text-white/80 hover:text-white"
                >
                  Manage ({myStories.length})
                </button>
                <button
                  onClick={handleOpenMyStory}
                  className="btn-snap px-5 py-2.5 text-xs font-bold flex items-center gap-2 text-black"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Story</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/camera')}
                className="btn-snap px-5 py-2.5 text-xs font-bold flex items-center gap-2 text-black"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture Snap</span>
              </button>
            )}
          </div>
        </section>

        {/* Friends Stories Circle Avatar Trays */}
        <section className="mb-12">
          <h2 className="text-sm font-black uppercase tracking-wider text-white/60 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFFC00]" />
            <span>Friends' Updates</span>
          </h2>

          <div className="flex items-center gap-5 overflow-x-auto no-scrollbar py-2">
            {/* 1. Current User's Story Circle in Story Tray */}
            <div
              onClick={handleOpenMyStory}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group w-20"
            >
              <div
                className={`relative w-18 h-18 p-[3px] rounded-full transition-transform duration-300 group-hover:scale-110 active:scale-95 ${
                  myStories.length > 0
                    ? 'snap-gradient shadow-lg shadow-[#FFFC00]/25'
                    : 'border-2 border-dashed border-white/30 hover:border-[#FFFC00] bg-white/5'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-[#0E0E18] p-0.5 overflow-hidden flex items-center justify-center">
                  {myStories.length > 0 ? (
                    myStories[0].type === 'video' || myStories[0].mediaType === 'video' ? (
                      <div className="relative w-full h-full">
                        <video
                          src={myStories[0].mediaUrl || myStories[0].url}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Film className="w-4 h-4 text-[#FFFC00]" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={myStories[0].mediaUrl || myStories[0].url}
                        alt="My Story"
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <img
                      src={
                        userProfile?.photoURL ||
                        currentUser?.photoURL ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.uid || 'you'}`
                      }
                      alt="Your Profile"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#FFFC00] text-black flex items-center justify-center shadow-md border-2 border-[#0A0A0F]">
                  <Plus className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

              <div className="w-full text-center">
                <span className="text-xs font-bold text-white group-hover:text-[#FFFC00] transition-colors truncate block max-w-full">
                  My Story
                </span>
                <span className="text-[10px] text-white/50 block font-mono -mt-0.5">
                  {myStories.length > 0 ? `${myStories.length} active` : 'Add Snap'}
                </span>
              </div>
            </div>

            {/* 2. Friends' Stories Circles in Tray */}
            {friendStories.map((friend) => (
              <div
                key={friend.id}
                onClick={() => handleOpenFriendStory(friend)}
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group w-20"
              >
                <div
                  className={`w-18 h-18 p-[3px] rounded-full transition-transform duration-300 group-hover:scale-110 active:scale-95 ${
                    friend.hasUnseen
                      ? 'snap-gradient shadow-lg shadow-[#FFFC00]/25'
                      : 'border-2 border-white/20 bg-white/5'
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-[#0E0E18] p-0.5 overflow-hidden">
                    <img
                      src={friend.user.avatar}
                      alt={friend.user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>

                <div className="w-full text-center">
                  <span
                    onClick={(e) => {
                      if (friend.user?.uid || friend.id) {
                        e.stopPropagation();
                        navigate(`/user/${friend.user?.uid || friend.id}`);
                      }
                    }}
                    className="text-xs font-semibold text-white/80 hover:text-[#FFFC00] transition-colors truncate block max-w-full hover:underline"
                    title={`View @${friend.user.handle || 'user'}`}
                  >
                    {(friend.user?.name || 'Friend').split(' ')[0]}
                  </span>
                  {friend.user?.handle && (
                    <span className="text-[10px] text-white/40 block truncate font-mono -mt-0.5">
                      @{friend.user.handle.replace(/^@/, '')}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/40 -mt-1 font-mono">
                  {friend.lastUpdated}
                </span>
              </div>
            ))}

            {friendStories.length === 0 && (
              <div className="py-4 px-4 rounded-2xl bg-white/5 border border-white/10 text-center flex-1 min-w-[240px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-full bg-[#FFFC00]/10 border border-[#FFFC00]/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-[#FFFC00]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Friends' Stories</h4>
                    <p className="text-[10px] text-white/50">When friends upload snaps, they show here.</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/add-friends')}
                  className="glass-pill px-3 py-1.5 text-[11px] font-bold text-[#FFFC00] hover:border-[#FFFC00]/40 flex-shrink-0"
                >
                  Add Friends
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Discover / Subscriptions Feed */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FFFC00]" />
              <span>Discover Creators</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {discoverStories.map((item) => (
              <div
                key={item.id}
                onClick={() =>
                  setActiveStoryGroup({
                    user: { name: item.creator, handle: item.creator.toLowerCase().replace(/\s+/g, '_'), avatar: item.image },
                    items: [{ id: item.id, type: 'photo', url: item.image, caption: item.title, time: 'Trending' }],
                  })
                }
                className="group relative aspect-[9/14] rounded-2xl overflow-hidden bg-black/60 border border-white/10 cursor-pointer shadow-lg hover:border-[#FFFC00]/40 transition-all duration-300"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-between p-3.5">
                  <div className="flex justify-end">
                    <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-mono text-white/80">
                      {item.views}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#FFFC00] block mb-0.5">
                      {item.creator}
                    </span>
                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                      {item.title}
                    </h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Manage My Story Modal */}
      <AnimatePresence>
        {showManageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowManageModal(false)}
          >
            <div
              className="glass-panel rounded-3xl p-6 max-w-md w-full border border-white/20 shadow-2xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">My Active Stories</h3>
                  <p className="text-xs text-white/50">Each snap automatically disappears after 24 hours.</p>
                </div>
                <button
                  onClick={() => setShowManageModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {myStories.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0">
                        {item.type === 'video' ? (
                          <video src={item.url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {item.type === 'video' ? '🎥 Video' : '📸 Photo'}
                          </span>
                          <span className="text-[10px] text-[#FFFC00] font-mono">
                            {item.time || 'Today'}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 truncate max-w-[180px]">
                          {item.caption || 'No caption'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          deleteFromMyStory(item.id);
                          toast.success('Snap deleted from story');
                        }}
                        className="w-8 h-8 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/30 flex items-center justify-center"
                        title="Delete Snap"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setShowManageModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 glass-pill py-2.5 text-xs font-bold text-white hover:bg-white/15 flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Snap</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Story Viewer Modal */}
      <AnimatePresence>
        {activeStoryGroup && (
          <StoryViewerModal
            storyGroup={activeStoryGroup}
            onClose={() => setActiveStoryGroup(null)}
            onStoryViewed={handleStoryViewed}
            onStoryComplete={() => {
              const currentFriendIndex = friendStories.findIndex(
                (f) => f.id === activeStoryGroup.id
              );
              if (
                currentFriendIndex !== -1 &&
                currentFriendIndex < friendStories.length - 1
              ) {
                const nextFriend = friendStories[currentFriendIndex + 1];
                setActiveStoryGroup(nextFriend);
              } else {
                setActiveStoryGroup(null);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
