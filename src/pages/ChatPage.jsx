import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Search,
  UserPlus,
  Send,
  ArrowLeft,
  Flame,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Sparkles,
  X,
  Play,
  Clock,
  MoreVertical,
  Paperclip,
  UserCheck,
  UserX,
  Eye,
  Film
} from 'lucide-react';
import Header from '../components/Header';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const {
    friends,
    friendRequests,
    activeFriend,
    activeFriendId,
    setActiveFriendId,
    sendMessage,
    sendSnapToFriend,
    openSnapMessage,
    addFriend,
    searchUsers,
    searchResults,
    isSearching,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useChat();

  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'find' | 'requests'
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendHandle, setNewFriendHandle] = useState('');

  // Disappearing Snap State
  const [viewingSnap, setViewingSnap] = useState(null); // { message, friendId }
  const [snapCountdown, setSnapCountdown] = useState(100); // 100% down to 0%

  const mediaInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Sync state from location (e.g. from camera quick-send)
  useEffect(() => {
    if (location.state?.sendToFriendId || location.state?.activeFriendId) {
      setActiveFriendId(location.state.sendToFriendId || location.state.activeFriendId);
    }
  }, [location.state, setActiveFriendId]);

  // Handle hardware / browser back button on mobile when in chat
  useEffect(() => {
    const handlePopState = () => {
      setActiveFriendId(null);
    };

    if (activeFriendId) {
      window.history.pushState({ inChat: true }, '');
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [activeFriendId, setActiveFriendId]);

  const handleBackToFriends = () => {
    setActiveFriendId(null);
    if (window.history.state?.inChat) {
      window.history.back();
    }
  };

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeFriend?.messages]);

  // Live User Search trigger
  useEffect(() => {
    if (activeTab === 'find' && searchQuery.trim().length > 1) {
      searchUsers(searchQuery);
    }
  }, [activeTab, searchQuery, searchUsers]);

  // Disappearing snap timer
  useEffect(() => {
    if (!viewingSnap) return;

    const DURATION_SECONDS = viewingSnap.message.mediaType === 'video' ? 12 : 7;
    const intervalTime = 50;
    const step = (intervalTime / (DURATION_SECONDS * 1000)) * 100;

    setSnapCountdown(100);

    const timer = setInterval(() => {
      setSnapCountdown((prev) => {
        if (prev - step <= 0) {
          clearInterval(timer);
          handleCloseSnap();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [viewingSnap]);

  const handleCloseSnap = () => {
    if (viewingSnap) {
      openSnapMessage(viewingSnap.friendId, viewingSnap.message.id);
      setViewingSnap(null);
      toast('Snap expired and disappeared 💨', {
        icon: '👻',
        style: { background: '#141420', color: '#fff', border: '1px solid rgba(255,252,0,0.3)' },
      });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeFriendId) return;
    sendMessage(activeFriendId, messageInput);
    setMessageInput('');
  };

  // Direct media upload in chat
  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeFriendId) return;

    const isVideo = file.type.startsWith('video');
    const isImage = file.type.startsWith('image');
    if (!isVideo && !isImage) {
      toast.error('Please select an image or video');
      return;
    }

    const url = URL.createObjectURL(file);
    // Ask if send as regular media or as disappearing snap
    sendSnapToFriend(activeFriendId, {
      snapUrl: url,
      type: isVideo ? 'video' : 'photo',
      caption: isVideo ? 'Video Snap' : 'Photo Snap',
    });
    toast.success('Disappearing Snap sent! 🚀');
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  const handleOpenSnap = (friendId, msg) => {
    if (msg.opened || !msg.snapUrl) {
      toast('Snap already viewed and expired.', { icon: '🔒' });
      return;
    }
    setViewingSnap({ friendId, message: msg });
  };

  const handleCreateFriend = (e) => {
    e.preventDefault();
    if (!newFriendName.trim() || !newFriendHandle.trim()) {
      toast.error('Please enter name and username handle.');
      return;
    }
    const created = addFriend(newFriendName.trim(), newFriendHandle.trim());
    toast.success(`Added ${created.name}!`);
    setNewFriendName('');
    setNewFriendHandle('');
    setShowAddFriendModal(false);
    setActiveFriendId(created.id);
  };

  const filteredFriends = friends.filter((f) => {
    if (!searchQuery.trim() || activeTab !== 'friends') return true;
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.handle.toLowerCase().includes(q);
  });

  // Unread received snaps across all friends
  const receivedSnaps = useMemo(() => {
    const list = [];
    friends.forEach((friend) => {
      (friend.messages || []).forEach((msg) => {
        if (msg.sender === 'them' && msg.type === 'snap' && !msg.opened && msg.snapUrl) {
          list.push({
            friend,
            message: msg,
          });
        }
      });
    });
    return list;
  }, [friends]);

  return (
    <div className="min-h-dvh bg-[#0A0A0F] text-white flex flex-col pb-20 sm:pb-24">
      <Header />

      {/* Hidden Media Input */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaUpload}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto pt-16 sm:pt-20 px-0 sm:px-4 md:px-6 flex">
        <div className="w-full flex-1 flex flex-col md:flex-row rounded-none sm:rounded-3xl overflow-hidden glass-panel border-0 sm:border sm:border-white/10 shadow-2xl md:h-[calc(100vh-140px)] min-h-0">
          {/* LEFT SIDE: Friends & Requests Navigation */}
          <div
            className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-white/10 bg-[#0E0E18]/85 flex-shrink-0 ${
              activeFriendId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* List Header */}
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Chat</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFFC00]/15 text-[#FFFC00] font-bold">
                    {friends.length}
                  </span>
                </h1>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAddFriendModal(true)}
                  className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center text-white/80 hover:text-white"
                  title="Add Custom Friend"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/camera')}
                  className="w-9 h-9 rounded-xl btn-snap flex items-center justify-center text-black"
                  title="Open Camera"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs (Friends / Find Users / Requests) */}
            <div className="flex items-center px-3 pt-3 pb-1 border-b border-white/5 gap-1">
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'friends'
                    ? 'bg-white/10 text-[#FFFC00]'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                Friends ({friends.length})
              </button>
              <button
                onClick={() => setActiveTab('find')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'find'
                    ? 'bg-white/10 text-[#FFFC00]'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                Find Users
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'requests'
                    ? 'bg-white/10 text-[#FFFC00]'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <span>Requests</span>
                {friendRequests.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#FFFC00] text-black text-[10px] font-black flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'find'
                      ? 'Search Firestore by username, name...'
                      : 'Search friends...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFFC00]"
                />
              </div>
            </div>

            {/* Tab 1: Friends Scroll List */}
            {activeTab === 'friends' && (
              <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5">
                {/* ── RECEIVED SNAPS TRAY (Instant 1-Tap Viewing) ── */}
                {receivedSnaps.length > 0 && !searchQuery.trim() && (
                  <div className="p-3 bg-gradient-to-r from-red-500/15 via-pink-500/10 to-amber-500/10 border-b border-red-500/25">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span>Received Snaps ({receivedSnaps.length})</span>
                      </span>
                      <span className="text-[10px] text-white/50 font-medium">Tap to view</span>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar touch-scroll-x py-1 px-1">
                      {receivedSnaps.map(({ friend, message }) => (
                        <div
                          key={message.id}
                          onClick={() => handleOpenSnap(friend.id, message)}
                          className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group"
                        >
                          <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-red-500 via-pink-500 to-[#FFFC00] shadow-lg shadow-red-500/20 group-hover:scale-105 active:scale-95 transition-transform">
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-[#0E0E18]"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] shadow-md border border-[#0E0E18]">
                              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-white max-w-[68px] truncate text-center">
                            {friend.name.split(' ')[0]}
                          </span>
                          <span className="text-[9px] text-white/40 -mt-1 font-mono">
                            {message.time || 'New'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {filteredFriends.length === 0 ? (
                  <div className="p-8 text-center text-xs text-white/40">
                    No friends found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isActive = activeFriendId === friend.id;
                    return (
                      <div
                        key={friend.id}
                        onClick={() => setActiveFriendId(friend.id)}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isActive ? 'bg-[#FFFC00]/10 border-l-4 border-l-[#FFFC00]' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-12 h-12 rounded-full object-cover border border-white/10"
                            />
                            {friend.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FFFC00] border-2 border-[#0A0A0F]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-white truncate">{friend.name}</h4>
                              {friend.streak > 0 && (
                                <span className="flex items-center text-xs font-black text-amber-400">
                                  <Flame className="w-3 h-3 fill-current text-amber-500" />
                                  <span>{friend.streak}</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-white/50 truncate flex items-center gap-1 mt-0.5">
                              {friend.status === 'received' && (
                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
                              )}
                              <span>{friend.lastInteraction}</span>
                              <span>•</span>
                              <span>{friend.lastInteractionTime}</span>
                            </p>
                          </div>
                        </div>

                        {/* Quick Snap Camera Icon */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/camera', { state: { sendToFriendId: friend.id } });
                          }}
                          className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-white/60 hover:text-[#FFFC00] transition-colors"
                          title={`Send snap to ${friend.name}`}
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Find Users (Search in Cloud & Local pool) */}
            {activeTab === 'find' && (
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                {isSearching ? (
                  <div className="p-8 text-center text-xs text-white/50">Searching users...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-white/40">
                    {searchQuery ? 'No users found.' : 'Type a name or @handle to discover users.'}
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-white truncate">{user.name}</h4>
                          <span className="text-[11px] text-white/50 font-mono">@{user.handle}</span>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          await sendFriendRequest(user);
                          toast.success(`Friend request sent to @${user.handle}!`, { icon: '👋' });
                        }}
                        className="btn-snap px-3 py-1.5 text-xs font-bold text-black flex items-center gap-1.5 flex-shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Friend Requests Inbox */}
            {activeTab === 'requests' && (
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                {friendRequests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-white/40">No pending friend requests.</div>
                ) : (
                  friendRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={req.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-white truncate">{req.senderName}</h4>
                          <span className="text-[10px] text-white/50 font-mono">@{req.senderHandle}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={async () => {
                            await acceptFriendRequest(req.id);
                            toast.success(`Accepted ${req.senderName}'s request!`);
                          }}
                          className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/40"
                          title="Accept Request"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            await rejectFriendRequest(req.id);
                            toast('Request declined');
                          }}
                          className="w-8 h-8 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 flex items-center justify-center hover:bg-red-500/30"
                          title="Decline Request"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE / MOBILE FULL-SCREEN: Active Conversation */}
          <div
            className={`min-w-0 ${
              activeFriendId
                ? 'fixed inset-0 z-50 flex flex-col bg-[#0A0A0F] md:relative md:inset-auto md:z-auto md:flex-1 md:bg-[#0A0A12]/80'
                : 'hidden md:flex md:flex-1 items-center justify-center bg-[#0A0A12]/80'
            }`}
          >
            {activeFriend ? (
              <>
                {/* Dedicated Snapchat Chat Header */}
                <div className="h-16 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between bg-[#0E0E18]/90 backdrop-blur-xl flex-shrink-0 z-10 pt-safe">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <button
                      onClick={handleBackToFriends}
                      className="md:hidden w-9 h-9 rounded-full glass-pill flex items-center justify-center text-white/90 hover:text-white active:scale-95 flex-shrink-0"
                      title="Back to Friends"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="relative flex-shrink-0">
                      <img
                        src={activeFriend.avatar}
                        alt={activeFriend.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#FFFC00]/60 ring-2 ring-black/40"
                      />
                      <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0A0A0F] absolute -bottom-0.5 -right-0.5 shadow-sm" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                          {activeFriend.name}
                        </h3>
                        {activeFriend.streak > 0 && (
                          <span className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex-shrink-0">
                            <Flame className="w-3 h-3 fill-current text-amber-500" />
                            <span>{activeFriend.streak}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/50 font-mono truncate flex items-center gap-1.5 mt-0.5">
                        <span>@{activeFriend.handle}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">Active now</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        navigate('/camera', { state: { sendToFriendId: activeFriend.id } })
                      }
                      className="btn-snap px-3 py-1.5 rounded-full text-xs font-bold text-black flex items-center gap-1.5 shadow-md shadow-[#FFFC00]/20 hover:scale-105 active:scale-95 transition-all"
                      title={`Send Snap to ${activeFriend.name}`}
                    >
                      <Camera className="w-4 h-4" />
                      <span className="hidden sm:inline">Send Snap</span>
                    </button>
                  </div>
                </div>

                {/* Message Bubble Thread */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 min-w-0 w-full overflow-x-hidden no-scrollbar">
                  {/* Centered Date Separator */}
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                      Today
                    </span>
                  </div>

                  {(activeFriend.messages || []).map((msg) => {
                    const isMe = msg.sender === 'me';
                    const isSnap = msg.type === 'snap';

                    return (
                      <div
                        key={msg.id}
                        className={`w-full flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1`}
                      >
                        {isSnap ? (
                          /* Disappearing Snap Message Card */
                          <div
                            onClick={() => handleOpenSnap(activeFriend.id, msg)}
                            className={`cursor-pointer rounded-2xl p-3 flex items-center gap-3 transition-all duration-200 max-w-[280px] sm:max-w-xs shadow-lg ${
                              isMe
                                ? msg.opened
                                  ? 'bg-white/5 border border-white/10 opacity-70'
                                  : 'bg-[#FFFC00]/15 border border-[#FFFC00]/30 hover:border-[#FFFC00]/50 shadow-[#FFFC00]/5'
                                : msg.opened
                                ? 'bg-white/5 border border-white/10 opacity-70'
                                : 'bg-gradient-to-r from-red-500/25 via-pink-500/20 to-purple-500/25 border border-red-500/40 hover:scale-105 active:scale-95 shadow-red-500/10'
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isMe
                                  ? msg.opened
                                    ? 'bg-white/10 text-white/50'
                                    : 'bg-[#FFFC00] text-black shadow-md shadow-[#FFFC00]/25'
                                  : msg.opened
                                  ? 'bg-white/10 text-white/50'
                                  : 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                              }`}
                            >
                              {isMe ? (
                                msg.opened ? <Eye className="w-5 h-5" /> : <Send className="w-4 h-4 ml-0.5" />
                              ) : (
                                msg.opened ? <Eye className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white block truncate">
                                {isMe
                                  ? msg.opened
                                    ? 'Snap Opened'
                                    : msg.mediaType === 'video'
                                    ? 'Video Snap Delivered'
                                    : 'Photo Snap Delivered'
                                  : msg.opened
                                  ? 'Snap Viewed'
                                  : 'New Disappearing Snap'}
                              </span>
                              <span className="text-[11px] text-white/60 block truncate">
                                {isMe
                                  ? msg.opened
                                    ? 'Opened by ' + activeFriend.name.split(' ')[0]
                                    : 'Delivered • Tap to preview'
                                  : msg.opened
                                  ? 'Opened • Disappeared'
                                  : 'Tap to view (Timed) 🔥'}
                              </span>
                            </div>
                          </div>
                        ) : msg.mediaUrl ? (
                          /* Standard Media Attachment */
                          <div
                            className={`rounded-2xl overflow-hidden border max-w-[260px] sm:max-w-sm shadow-lg ${
                              isMe ? 'bg-[#FFFC00]/15 border-[#FFFC00]/30' : 'bg-[#181824] border-white/10'
                            }`}
                          >
                            {msg.mediaType === 'video' ? (
                              <video src={msg.mediaUrl} controls className="w-full max-h-60 object-cover" />
                            ) : (
                              <img src={msg.mediaUrl} alt="Snap" className="w-full max-h-60 object-cover" />
                            )}
                            {msg.text && (
                              <p className="p-2.5 text-xs text-white/90 break-words">{msg.text}</p>
                            )}
                          </div>
                        ) : (
                          /* Standard Text Message */
                          <div
                            className={`px-4 py-2.5 rounded-2xl max-w-[78%] sm:max-w-md text-xs sm:text-sm font-medium shadow-md ${
                              isMe
                                ? 'bg-gradient-to-r from-[#FFFC00] to-[#FFE600] text-black font-semibold rounded-br-xs shadow-[#FFFC00]/15'
                                : 'bg-[#181824] text-white border border-white/10 rounded-bl-xs'
                            }`}
                          >
                            <p className="leading-relaxed break-words whitespace-pre-wrap select-text">
                              {msg.text}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-[10px] text-white/40 font-mono">
                            {msg.time}
                          </span>
                          {isMe && (
                            <span className="text-[10px] text-[#FFFC00]/70 flex items-center">
                              <CheckCheck className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Modern Snapchat Chat Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-2.5 sm:p-3 border-t border-white/10 flex items-center gap-2 bg-[#0E0E18]/95 backdrop-blur-xl flex-shrink-0 w-full min-w-0 pb-safe"
                >
                  {/* Camera quick-shoot button */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/camera', { state: { sendToFriendId: activeFriend.id } })
                    }
                    className="w-10 h-10 rounded-full btn-snap flex-shrink-0 flex items-center justify-center text-black hover:scale-105 active:scale-95 shadow-md shadow-[#FFFC00]/20 transition-all"
                    title="Camera Snap"
                  >
                    <Camera className="w-5 h-5 text-black" />
                  </button>

                  {/* Attachment button */}
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    className="w-10 h-10 rounded-full glass-pill flex-shrink-0 flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all"
                    title="Attach Photo or Video"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Text input */}
                  <input
                    type="text"
                    placeholder={`Chat with ${activeFriend.name.split(' ')[0]}...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 min-w-0 h-10 px-4 rounded-full bg-white/8 border border-white/12 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FFFC00] focus:bg-white/10 focus:ring-1 focus:ring-[#FFFC00]/40 transition-all"
                  />

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                      messageInput.trim()
                        ? 'snap-gradient text-black font-bold shadow-lg shadow-[#FFFC00]/30 hover:scale-105 active:scale-95'
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </>
            ) : (
              /* No chat selected placeholder */
              <div className="text-center p-8 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-3xl snap-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#FFFC00]/20">
                  <Camera className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Select a Friend to Chat</h3>
                <p className="text-xs text-white/50 leading-relaxed mb-6">
                  Send disappearing snaps, maintain daily streaks, and chat with friends.
                </p>
                <button
                  onClick={() => setActiveTab('find')}
                  className="glass-pill px-5 py-2 text-xs font-semibold text-white/80 hover:text-white"
                >
                  Find Users
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Disappearing Snap Viewer Modal with Countdown Progress */}
      <AnimatePresence>
        {viewingSnap && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 select-none"
          >
            {(() => {
              const snapSender = friends.find((f) => f.id === viewingSnap.friendId);
              return (
                <div
                  className="relative w-full h-full sm:max-w-md sm:max-h-[92vh] sm:rounded-3xl overflow-hidden border-0 sm:border sm:border-white/20 shadow-2xl flex flex-col justify-between bg-black cursor-pointer"
                  onClick={handleCloseSnap}
                >
                  {/* Countdown Progress Bar at Top */}
                  <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
                      <div
                        className="h-full bg-[#FFFC00] transition-all duration-75 shadow-sm shadow-[#FFFC00]"
                        style={{ width: `${snapCountdown}%` }}
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseSnap();
                      }}
                      className="w-7 h-7 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                      title="Close Snap"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sender Profile Header Overlay */}
                  <div className="absolute top-8 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2.5 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                      <img
                        src={snapSender?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={snapSender?.name || 'Sender'}
                        className="w-8 h-8 rounded-full object-cover border-2 border-[#FFFC00]"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">
                          {snapSender?.name || 'Snap Friend'}
                        </h4>
                        <span className="text-[10px] text-white/60 font-mono">
                          @{snapSender?.handle || 'user'} • {viewingSnap.message.time || 'Just now'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono font-bold text-[#FFFC00] shadow-lg">
                      {viewingSnap.message.mediaType === 'video' ? 'VIDEO SNAP' : 'PHOTO SNAP'}
                    </div>
                  </div>

                  {/* Media Container */}
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    {viewingSnap.message.mediaType === 'video' ? (
                      <video
                        src={viewingSnap.message.snapUrl}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={viewingSnap.message.snapUrl}
                        alt="Snap"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Tap to Close Hint */}
                  <div className="absolute top-20 right-3 z-20 pointer-events-none">
                    <span className="text-[10px] font-bold text-white/50 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      Tap anywhere to close
                    </span>
                  </div>

              {/* Caption Overlay */}
              {viewingSnap.message.caption && (
                <div className="absolute bottom-6 left-4 right-4 z-20 text-center pointer-events-none">
                  <span className="inline-block px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-sm font-bold text-white">
                    {viewingSnap.message.caption}
                  </span>
                </div>
              )}
            </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Custom Friend Modal */}
      <AnimatePresence>
        {showAddFriendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowAddFriendModal(false)}
          >
            <div
              className="glass-panel rounded-3xl p-6 max-w-sm w-full border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#FFFC00]" />
                  <span>Add Friend</span>
                </h3>
                <button onClick={() => setShowAddFriendModal(false)}>
                  <X className="w-4 h-4 text-white/60 hover:text-white" />
                </button>
              </div>

              <form onSubmit={handleCreateFriend} className="space-y-3">
                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Maya Patel"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#FFFC00]"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1">Username Handle</label>
                  <input
                    type="text"
                    placeholder="e.g. @mayap"
                    value={newFriendHandle}
                    onChange={(e) => setNewFriendHandle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#FFFC00]"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFriendModal(false)}
                    className="flex-1 glass-pill py-2.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-snap py-2.5 text-xs font-bold text-black">
                    Add Friend
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
