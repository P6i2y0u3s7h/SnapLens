import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  MessageSquare,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Check,
  Flame,
  Sparkles,
  Share2,
  MoreVertical,
  ShieldAlert,
  Play,
  Film,
  Image as ImageIcon,
  Calendar,
  Users,
  Eye,
  AlertTriangle,
  Loader2,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import { fetchFriendProfileDataInCloud } from '../services/firebaseService';
import toast from 'react-hot-toast';

export default function FriendProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    friends,
    friendRequests,
    sentRequests,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    getRequestStatus,
  } = useChat();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [activeStoryToView, setActiveStoryToView] = useState(null);
  const [activeSnapToView, setActiveSnapToView] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Redirect to own profile if clicking self
  useEffect(() => {
    if (currentUser?.uid && userId === currentUser.uid) {
      navigate('/profile', { replace: true });
    }
  }, [currentUser, userId, navigate]);

  // Fetch real profile data from Firestore
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!userId) return;
      setIsLoading(true);

      // Check if already in local friends list for instant cached render
      const cachedFriend = friends.find((f) => f.id === userId || f.uid === userId);
      if (cachedFriend) {
        setProfile((prev) => prev || cachedFriend);
      }

      try {
        const cloudData = await fetchFriendProfileDataInCloud(userId, currentUser?.uid);
        if (isMounted) {
          if (cloudData) {
            setProfile(cloudData);
          } else if (cachedFriend) {
            setProfile(cachedFriend);
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.warn('Friend profile load error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [userId, currentUser, friends]);

  // Real-time friendship status
  const friendshipStatus = useMemo(() => {
    return getRequestStatus(userId);
  }, [getRequestStatus, userId]);

  // Handle Add Friend Action
  const handleAddFriendAction = async () => {
    if (!profile) return;
    setIsProcessingAction(true);
    try {
      const res = await sendFriendRequest(profile);
      if (res.autoAccepted) {
        toast.success(`You and ${profile.name} are now friends! 🎉`, { icon: '🤝' });
      } else if (res.success) {
        toast.success(`Friend request sent to ${profile.name}! 🚀`);
      } else {
        toast.error(res.error || 'Failed to send request');
      }
    } catch {
      toast.error('Could not send friend request.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Accept Incoming Request
  const handleAcceptRequestAction = async () => {
    const req = friendRequests.find((r) => r.senderId === userId);
    if (!req) return;
    setIsProcessingAction(true);
    try {
      const res = await acceptFriendRequest(req.id);
      if (res.success) {
        toast.success(`Accepted ${profile?.name}'s friend request! 💛`, { icon: '✨' });
      }
    } catch {
      toast.error('Failed to accept request.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Confirm Remove Friend
  const handleConfirmRemoveFriend = async () => {
    if (!profile) return;
    setIsProcessingAction(true);
    try {
      await removeFriend(profile.id || profile.uid);
      toast.success(`Removed ${profile.name} from friends`);
      setShowRemoveModal(false);
      setShowOptionsMenu(false);
    } catch {
      toast.error('Failed to remove friend.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Confirm Block User
  const handleConfirmBlock = async () => {
    if (!profile) return;
    setIsProcessingAction(true);
    try {
      await blockUser(profile.id || profile.uid);
      setProfile((prev) => (prev ? { ...prev, isBlocked: true, isFriend: false } : null));
      toast.success(`Blocked ${profile.name}`);
      setShowBlockModal(false);
      setShowOptionsMenu(false);
    } catch {
      toast.error('Failed to block user.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Unblock User
  const handleUnblock = async () => {
    if (!profile) return;
    setIsProcessingAction(true);
    try {
      await unblockUser(profile.id || profile.uid);
      setProfile((prev) => (prev ? { ...prev, isBlocked: false } : null));
      toast.success(`Unblocked ${profile.name}`);
    } catch {
      toast.error('Failed to unblock user.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Share profile URL
  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied to clipboard! 📋');
    } else {
      toast('Share profile: ' + window.location.href);
    }
    setShowOptionsMenu(false);
  };

  // Format joined date
  const formattedJoinedDate = useMemo(() => {
    if (!profile?.createdAtMs) return '2026';
    const d = new Date(profile.createdAtMs);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [profile?.createdAtMs]);

  // Format friends since date
  const formattedFriendsSince = useMemo(() => {
    if (!profile?.friendsSince) return null;
    const d = new Date(profile.friendsSince);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [profile?.friendsSince]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[#0A0A0F] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFFC00] mb-3" />
        <span className="text-xs text-white/50 tracking-wider font-semibold uppercase">
          Loading Snap Profile...
        </span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-dvh bg-[#0A0A0F] text-white flex flex-col">
        <Header />
        <main className="flex-1 max-w-md w-full mx-auto pt-24 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">User Not Found</h2>
          <p className="text-xs text-white/50 mb-6 leading-relaxed">
            This SnapLens creator profile might have changed or does not exist.
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="btn-snap px-6 py-2.5 rounded-full text-xs font-bold text-black flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Chat</span>
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0A0A0F] text-white flex flex-col pb-28">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto pt-16 sm:pt-20 px-3 sm:px-6">
        {/* ── TOP NAV BAR ── */}
        <div className="flex items-center justify-between py-3 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl glass-pill flex items-center justify-center text-white/80 hover:text-white hover:border-[#FFFC00]/40 transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-black uppercase tracking-wider text-white/50 font-mono">
            @{profile.handle}
          </span>

          {/* Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu((prev) => !prev)}
              className="w-10 h-10 rounded-2xl glass-pill flex items-center justify-center text-white/80 hover:text-white hover:border-[#FFFC00]/40 transition-colors"
              title="Profile Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#141420] border border-white/15 shadow-2xl p-1.5 z-40">
                <button
                  onClick={handleShareProfile}
                  className="w-full px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 rounded-xl flex items-center gap-2 transition-colors text-left"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#FFFC00]" />
                  <span>Share Profile Link</span>
                </button>

                {friendshipStatus === 'friends' && (
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowRemoveModal(true);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/15 rounded-xl flex items-center gap-2 transition-colors text-left"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Remove Friend</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    if (profile.isBlocked) {
                      handleUnblock();
                    } else {
                      setShowBlockModal(true);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/15 rounded-xl flex items-center gap-2 transition-colors text-left"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{profile.isBlocked ? 'Unblock User' : 'Block User'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── PROFILE HEADER HERO CARD ── */}
        <div className="relative glass-panel rounded-3xl p-6 sm:p-8 border border-white/12 shadow-2xl overflow-hidden mb-6 text-center">
          {/* Decorative Snapchat Glow Gradient */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-b from-[#FFFC00]/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

          {/* Large Circular Avatar with Glowing Ring */}
          <div className="relative inline-block mx-auto mb-4">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#FFFC00] via-yellow-300 to-amber-500 shadow-xl shadow-[#FFFC00]/25">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-full h-full rounded-full object-cover border-4 border-[#0E0E18]"
              />
            </div>
            {profile.streak > 0 && (
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[#FFFC00] text-black text-xs font-black shadow-md flex items-center gap-0.5 border-2 border-[#0A0A0F]">
                <Flame className="w-3 h-3 fill-current text-amber-600" />
                <span>{profile.streak}</span>
              </span>
            )}
          </div>

          {/* Name & Handle */}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>{profile.name}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFFC00]" />
          </h1>
          <p className="text-xs sm:text-sm text-white/50 font-mono mt-0.5">
            @{profile.handle}
          </p>

          {/* Bio */}
          {profile.bio ? (
            <p className="text-xs sm:text-sm text-white/70 max-w-md mx-auto mt-3 leading-relaxed">
              {profile.bio}
            </p>
          ) : (
            <p className="text-xs text-white/40 max-w-md mx-auto mt-2 italic">
              SnapLens creator capturing daily moments.
            </p>
          )}

          {/* Blocked Banner if applicable */}
          {profile.isBlocked && (
            <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>You have blocked this creator</span>
              <button
                onClick={handleUnblock}
                className="ml-2 underline text-white hover:text-[#FFFC00]"
              >
                Unblock
              </button>
            </div>
          )}

          {/* ── PRIMARY PROFILE ACTION BUTTONS ── */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 mt-6 flex-wrap">
            {/* 1. Send Snap Button */}
            <button
              onClick={() =>
                navigate('/camera', { state: { sendToFriendId: profile.id || profile.uid } })
              }
              className="btn-snap px-5 py-2.5 rounded-full text-xs font-extrabold text-black flex items-center gap-2 shadow-lg shadow-[#FFFC00]/25 hover:scale-105 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4 text-black" />
              <span>Send Snap</span>
            </button>

            {/* 2. Chat Button */}
            <button
              onClick={() =>
                navigate('/chat', {
                  state: {
                    sendToFriendId: profile.id || profile.uid,
                    activeFriendId: profile.id || profile.uid,
                  },
                })
              }
              className="glass-pill px-5 py-2.5 rounded-full text-xs font-bold text-white hover:text-white flex items-center gap-2 hover:border-[#FFFC00]/40 transition-all hover:scale-105 active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-[#FFFC00]" />
              <span>Chat</span>
            </button>

            {/* 3. Dynamic Friendship State Button */}
            {friendshipStatus === 'friends' ? (
              <div className="px-4 py-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <UserCheck className="w-4 h-4" />
                <span>Friends</span>
              </div>
            ) : friendshipStatus === 'requested' ? (
              <div className="px-4 py-2.5 rounded-full bg-[#FFFC00]/15 border border-[#FFFC00]/30 text-[#FFFC00] font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <Clock className="w-4 h-4" />
                <span>Requested</span>
              </div>
            ) : friendshipStatus === 'received' ? (
              <button
                disabled={isProcessingAction}
                onClick={handleAcceptRequestAction}
                className="btn-snap px-4 py-2.5 rounded-full text-xs font-black text-black flex items-center gap-1.5 shadow-md shadow-[#FFFC00]/25 hover:scale-105 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Accept Request</span>
              </button>
            ) : (
              <button
                disabled={isProcessingAction}
                onClick={handleAddFriendAction}
                className="btn-snap px-5 py-2.5 rounded-full text-xs font-black text-black flex items-center gap-1.5 shadow-md shadow-[#FFFC00]/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <UserPlus className="w-4 h-4 text-black" />
                )}
                <span>+ Add Friend</span>
              </button>
            )}
          </div>
        </div>

        {/* ── STATS ROW (Real Firestore Data) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-[11px] font-medium mb-1">
              <span>Friends</span>
              <Users className="w-3.5 h-3.5 text-[#FFFC00]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {profile.friendsCount ?? 0}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-[11px] font-medium mb-1">
              <span>Stories</span>
              <Play className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {profile.activeStories?.length || 0}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-[11px] font-medium mb-1">
              <span>Snap Streak</span>
              <Flame className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {profile.streak > 0 ? `${profile.streak} 🔥` : '0 🔥'}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-[11px] font-medium mb-1">
              <span>Joined</span>
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm sm:text-base font-bold text-white truncate">
              {formattedJoinedDate}
            </div>
          </div>
        </div>

        {/* ── SNAPCHAT FRIENDSHIP CARD ── */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFFC00]" />
              <span>Friendship with {profile.name.split(' ')[0]}</span>
            </h3>
            {friendshipStatus === 'friends' && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Connected 💛
              </span>
            )}
          </div>

          <div className="space-y-3">
            {formattedFriendsSince && (
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                <span className="text-white/50">Friends Since</span>
                <span className="text-white font-semibold">{formattedFriendsSince}</span>
              </div>
            )}

            {/* Mutual Friends Section */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-white/50">Mutual Friends</span>
                <span className="text-white font-semibold">
                  {profile.mutualCount > 0 ? `${profile.mutualCount} mutual friend${profile.mutualCount > 1 ? 's' : ''}` : 'No mutual friends yet'}
                </span>
              </div>

              {profile.mutualFriends && profile.mutualFriends.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {profile.mutualFriends.map((mf) => (
                    <div
                      key={mf.id}
                      onClick={() => navigate(`/user/${mf.id}`)}
                      className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-white/5 hover:bg-white/10 cursor-pointer border border-white/10 transition-colors flex-shrink-0"
                      title={`View ${mf.name}'s profile`}
                    >
                      <img
                        src={mf.avatar}
                        alt={mf.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-xs font-semibold text-white/90 truncate max-w-[100px]">
                        {mf.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ACTIVE STORIES SECTION ── */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Active Stories ({profile.activeStories?.length || 0})</span>
            </h3>
            <span className="text-[10px] text-white/40 font-medium">Disappears in 24h</span>
          </div>

          {!profile.activeStories || profile.activeStories.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/40">
              No active stories from {profile.name.split(' ')[0]} right now.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {profile.activeStories.map((story) => (
                <div
                  key={story.id}
                  onClick={() => setActiveStoryToView(story)}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group shadow-md border border-white/10 hover:border-[#FFFC00]/60 transition-all"
                >
                  {story.type === 'video' ? (
                    <video
                      src={story.mediaUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <img
                      src={story.mediaUrl}
                      alt="Story"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
                    <span className="text-[11px] font-bold text-white truncate">
                      {story.caption || 'Story Snap'}
                    </span>
                    <span className="text-[9px] text-[#FFFC00] font-mono">
                      {story.type === 'video' ? 'Video' : 'Photo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SHARED SNAPS & MEMORIES SECTION (Viewer & Friend only) ── */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#FFFC00]" />
              <span>Shared Snaps ({profile.sharedSnaps?.length || 0})</span>
            </h3>
            <span className="text-[10px] text-white/40 font-medium">Shared with you</span>
          </div>

          {!profile.sharedSnaps || profile.sharedSnaps.length === 0 ? (
            <div className="py-10 text-center text-xs text-white/40 flex flex-col items-center justify-center">
              <Camera className="w-8 h-8 text-white/20 mb-2" />
              <p>No shared snaps between you and {profile.name.split(' ')[0]} yet.</p>
              <button
                onClick={() =>
                  navigate('/camera', { state: { sendToFriendId: profile.id || profile.uid } })
                }
                className="mt-3 text-[#FFFC00] font-bold hover:underline"
              >
                Send the first Snap! 🚀
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {profile.sharedSnaps.map((snap) => (
                <div
                  key={snap.id}
                  onClick={() => setActiveSnapToView(snap)}
                  className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-md border border-white/10 hover:border-[#FFFC00]/50 transition-all"
                >
                  {snap.mediaType === 'video' ? (
                    <video
                      src={snap.mediaUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <img
                      src={snap.mediaUrl}
                      alt="Snap"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                    <span className="text-[10px] font-bold text-white truncate">
                      {snap.isReceived ? `From ${profile.name.split(' ')[0]}` : 'Sent by you'}
                    </span>
                    <span className="text-[9px] text-[#FFFC00] font-mono">
                      {snap.caption || 'Snap'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── FULLSCREEN STORY / SNAP MODAL ── */}
      <AnimatePresence>
        {(activeStoryToView || activeSnapToView) && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <button
              onClick={() => {
                setActiveStoryToView(null);
                setActiveSnapToView(null);
              }}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {(() => {
              const item = activeStoryToView || activeSnapToView;
              const isVid = item?.type === 'video' || item?.mediaType === 'video';
              return (
                <div className="relative w-full h-full max-w-md mx-auto flex items-center justify-center">
                  {isVid ? (
                    <video
                      src={item.mediaUrl}
                      autoPlay
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={item.mediaUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )}
                  {item.caption && (
                    <div className="absolute bottom-10 left-4 right-4 p-3 rounded-2xl bg-black/60 backdrop-blur-md text-white text-xs text-center border border-white/10">
                      {item.caption}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

      {/* ── REMOVE FRIEND CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showRemoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass-panel rounded-3xl p-6 border border-white/15 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Remove {profile.name}?
              </h3>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                Are you sure you want to remove @{profile.handle} from your friends list? You will no longer see each other's private Snaps.
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRemoveModal(false)}
                  className="flex-1 py-2.5 rounded-xl glass-pill text-xs font-bold text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleConfirmRemoveFriend}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all"
                >
                  {isProcessingAction ? 'Removing...' : 'Remove Friend'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── BLOCK USER CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showBlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass-panel rounded-3xl p-6 border border-white/15 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Block {profile.name}?
              </h3>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                They will no longer be able to send you Snaps, chat with you, or view your stories. You can unblock them at any time.
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1 py-2.5 rounded-xl glass-pill text-xs font-bold text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleConfirmBlock}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all"
                >
                  {isProcessingAction ? 'Blocking...' : 'Block User'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
