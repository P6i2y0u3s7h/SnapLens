import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Camera,
  Image as ImageIcon,
  Film,
  Heart,
  Settings,
  Sparkles,
  Award,
  ShieldCheck,
  ChevronRight,
  HardDrive,
  MessageSquare,
  PlayCircle,
  Flame,
  Cloud,
  LogOut,
  LogIn,
  Edit2,
  X,
  Check,
  UserPlus,
  Copy
} from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useMemories } from '../hooks/useMemories';
import { useStories } from '../hooks/useStories';
import { useChat } from '../hooks/useChat';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    currentUser,
    userProfile,
    logout,
    updateUserProfile,
    setIsAuthModalOpen,
    isFirebaseConfigured,
  } = useAuth();

  const { memories } = useMemories();
  const { myStories } = useStories();
  const { friends } = useChat();

  const userHandle =
    userProfile?.handle?.replace(/^@/, '') ||
    userProfile?.username?.replace(/^@/, '') ||
    (currentUser?.displayName ? currentUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') : null) ||
    (currentUser?.email ? currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : null) ||
    (currentUser?.uid ? `user_${currentUser.uid.substring(0, 6)}` : 'snaplens_creator');

  const userId = currentUser?.uid || userProfile?.uid || null;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.displayName || 'Snap Creator');
  const [editBio, setEditBio] = useState(
    userProfile?.bio || 'Exploring real-time camera shaders and capturing life moments.'
  );
  const [editHandle, setEditHandle] = useState(userHandle);

  const photoCount = memories.filter((m) => m.type === 'photo').length;
  const videoCount = memories.filter((m) => m.type === 'video').length;
  const syncedCount = memories.filter((m) => m.isCloudSynced).length;
  const totalStreaks = friends.reduce((sum, f) => sum + (f.streak || 0), 0);

  const handleSaveProfile = async () => {
    const cleanHandle = editHandle.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '') || userHandle;
    await updateUserProfile({
      displayName: editName,
      bio: editBio,
      handle: cleanHandle,
    });
    setIsEditing(false);
  };

  const achievements = [
    {
      title: 'Creator Pioneer',
      desc: 'Tested early SnapLens web camera architecture.',
      icon: Sparkles,
      unlocked: true,
    },
    {
      title: 'Cloud Sync Master',
      desc: 'Synced snaps to Firebase Cloud Storage & Firestore.',
      icon: Cloud,
      unlocked: syncedCount > 0,
    },
    {
      title: 'Lens Aficionado',
      desc: 'Captured snaps with custom real-time shaders.',
      icon: Award,
      unlocked: memories.length > 0,
    },
    {
      title: 'Streak Master',
      desc: 'Maintained active snap streaks with friends.',
      icon: Flame,
      unlocked: totalStreaks > 10,
    },
    {
      title: 'Storyteller',
      desc: 'Published 24-hour ephemeral stories.',
      icon: PlayCircle,
      unlocked: myStories.length > 0,
    },
    {
      title: 'Director',
      desc: 'Recorded video moments with audio.',
      icon: Film,
      unlocked: videoCount > 0,
    },
  ];

  return (
    <div className="min-h-dvh bg-[#0A0A0F] text-white pb-28">
      <Header />

      <main className="max-w-4xl mx-auto pt-24 px-4 sm:px-6">
        {/* Profile Identity Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 mb-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFFC00]/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
            {/* Avatar with yellow ring */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full snap-gradient p-1 shadow-xl shadow-[#FFFC00]/20 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#0E0E18] overflow-hidden flex items-center justify-center">
                  {currentUser?.photoURL || userProfile?.photoURL ? (
                    <img
                      src={currentUser?.photoURL || userProfile?.photoURL}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-[#FFFC00]" />
                  )}
                </div>
              </div>
              <div
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-500 border-2 border-[#0A0A0F] flex items-center justify-center shadow"
                title="Camera Ready"
              >
                <Camera className="w-3.5 h-3.5 text-black" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
                    {currentUser?.displayName || 'Snap Creator'}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFC00]/20 text-[#FFFC00] font-bold border border-[#FFFC00]/40">
                      VIP
                    </span>
                  </h1>
                  <p className="text-white/40 text-xs mt-1 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                    <span className="font-mono text-white/75 font-semibold">@{userHandle}</span>
                    {userId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator?.clipboard?.writeText) {
                            navigator.clipboard.writeText(userId);
                            toast.success('User ID copied to clipboard!', { icon: '📋' });
                          }
                        }}
                        className="text-[10px] font-mono text-white/40 hover:text-[#FFFC00] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/10 transition-colors flex items-center gap-1"
                        title={`Click to copy User ID: ${userId}`}
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>ID: {userId.length > 10 ? `${userId.substring(0, 8)}...` : userId}</span>
                      </button>
                    )}
                    <span>•</span>
                    <span>Snap Score: {memories.length * 25 + 500} 🔥</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-center sm:self-auto">
                  <button
                    onClick={() => {
                      setEditName(currentUser?.displayName || '');
                      setEditBio(userProfile?.bio || '');
                      setEditHandle(userHandle);
                      setIsEditing(true);
                    }}
                    className="glass-pill px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:border-[#FFFC00]/40"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#FFFC00]" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    onClick={() => navigate('/settings')}
                    className="glass-pill w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white"
                    title="Preferences"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-white/70 max-w-lg mb-4 leading-relaxed">
                {userProfile?.bio ||
                  'Exploring real-time camera shaders, creative editing, and capturing life moments.'}
              </p>

              {/* Firebase Cloud Connection Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] mb-5">
                <Cloud
                  className={`w-3.5 h-3.5 ${
                    isFirebaseConfigured ? 'text-emerald-400' : 'text-[#FFFC00]'
                  }`}
                />
                <span className="text-white/70">
                  {isFirebaseConfigured
                    ? 'Firebase Storage & Firestore Live'
                    : 'Local Offline Engine Active (Ready for Firebase)'}
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button
                  onClick={() => navigate('/camera')}
                  className="btn-snap px-5 py-2.5 text-xs font-bold flex items-center gap-2"
                >
                  <Camera className="w-4 h-4 text-black" />
                  <span>Take a Snap</span>
                </button>

                <button
                  onClick={() => navigate('/memories')}
                  className="glass-pill px-5 py-2.5 text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4 text-[#FFFC00]" />
                  <span>Memories ({memories.length})</span>
                </button>

                <button
                  onClick={() => navigate('/add-friends')}
                  className="glass-pill px-5 py-2.5 text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 hover:border-[#FFFC00]/40 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-[#FFFC00]" />
                  <span>Add Friends</span>
                </button>

                {currentUser ? (
                  <button
                    onClick={logout}
                    className="glass-pill px-4 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="glass-pill px-5 py-2.5 text-xs font-semibold text-[#FFFC00] flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Memories', value: memories.length, icon: Camera, color: '#FFFC00', to: '/memories' },
            { label: 'Active Stories', value: myStories.length, icon: PlayCircle, color: '#06B6D4', to: '/stories' },
            { label: 'Friends', value: friends.length, icon: MessageSquare, color: '#10B981', to: '/add-friends' },
            { label: 'Snap Streaks', value: `${totalStreaks} 🔥`, icon: Flame, color: '#F59E0B' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                onClick={stat.to ? () => navigate(stat.to) : undefined}
                className={`glass-panel rounded-2xl p-5 border border-white/10 flex flex-col justify-between shadow-lg ${
                  stat.to ? 'cursor-pointer hover:border-[#FFFC00]/40 transition-all hover:scale-[1.02]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-white/50">{stat.label}</span>
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
              </div>
            );
          })}
        </div>

        {/* Stories & Memories Preview Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Active Stories */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-[#FFFC00]" />
                  <span>Active 24h Stories</span>
                </h2>
                <button
                  onClick={() => navigate('/stories')}
                  className="text-xs text-[#FFFC00] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myStories.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  <p>No active stories. Capture a snap and add it to your story!</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                  {myStories.slice(0, 4).map((story) => (
                    <div
                      key={story.id}
                      onClick={() => navigate('/stories')}
                      className="w-20 aspect-[9/14] rounded-xl overflow-hidden bg-black/60 border border-white/15 flex-shrink-0 cursor-pointer relative group"
                    >
                      {story.type === 'video' ? (
                        <video src={story.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={story.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
                      <span className="absolute bottom-1 left-1 text-[9px] font-mono text-white/80">
                        {story.time || '24h'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/camera')}
              className="mt-4 w-full py-2.5 rounded-xl glass-pill text-xs font-bold text-white hover:bg-white/10 flex items-center justify-center gap-2"
            >
              <Camera className="w-3.5 h-3.5 text-[#FFFC00]" />
              <span>Add to Story</span>
            </button>
          </div>

          {/* Recent Memories */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#FFFC00]" />
                  <span>Recent Memories</span>
                </h2>
                <button
                  onClick={() => navigate('/memories')}
                  className="text-xs text-[#FFFC00] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Open Gallery</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {memories.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  <p>No memories saved yet. Start capturing!</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                  {memories.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => navigate('/memories')}
                      className="w-20 aspect-square rounded-xl overflow-hidden bg-black/60 border border-white/15 flex-shrink-0 cursor-pointer relative group"
                    >
                      {m.type === 'video' ? (
                        <video src={m.url || m.dataUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={m.url || m.dataUrl} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/memories')}
              className="mt-4 w-full py-2.5 rounded-xl btn-snap text-xs font-bold text-black flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>View All Memories ({memories.length})</span>
            </button>
          </div>
        </div>

        {/* Creator Badges */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#FFFC00]" />
            <span>Achievements & Badges</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.map((ach) => {
              const Icon = ach.icon;
              return (
                <div
                  key={ach.title}
                  className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                    ach.unlocked
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white/[0.02] border-white/5 opacity-40'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      ach.unlocked ? 'bg-[#FFFC00]/15 text-[#FFFC00]' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{ach.title}</h3>
                    <p className="text-xs text-white/50">{ach.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel rounded-3xl p-6 max-w-sm sm:max-w-md w-full border border-white/15 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                  <h3 className="text-base font-bold text-white">Edit Profile</h3>
                  <button onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 text-white/60 hover:text-white" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold text-white/70 block mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-[#FFFC00]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white/70 block mb-1">
                      User ID / Handle
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-xs font-mono font-bold">@</span>
                      <input
                        type="text"
                        value={editHandle}
                        onChange={(e) => setEditHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="username"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-[#FFFC00]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white/70 block mb-1">
                      Bio
                    </label>
                    <textarea
                      rows="3"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-[#FFFC00] resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 glass-pill py-2.5 text-xs font-semibold text-white/70 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 btn-snap py-2.5 text-xs font-bold text-black flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4 text-black" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
