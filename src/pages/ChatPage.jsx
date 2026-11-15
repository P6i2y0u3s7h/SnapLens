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
  Film,
  RotateCcw,
  Bookmark,
  BookmarkCheck,
  Download,
  Pause,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import Header from '../components/Header';
import { useChat } from '../hooks/useChat';
import { useMemories } from '../hooks/useMemories';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { saveMemory } = useMemories();
  const {
    friends,
    friendRequests,
    activeFriend,
    activeFriendId,
    setActiveFriendId,
    sendMessage,
    deleteMessage,
    clearChat,
    sendSnapToFriend,
    openSnapMessage,
    replaySnapMessage,
    markSnapSavedLocally,
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

  // Disappearing Snap & Replay State
  const [viewingSnap, setViewingSnap] = useState(null); // { message, friendId, isReplay }
  const [snapCountdown, setSnapCountdown] = useState(100); // 100% down to 0%
  const [isPaused, setIsPaused] = useState(false);
  const [snapReplyText, setSnapReplyText] = useState('');
  const [savedSnapIds, setSavedSnapIds] = useState(new Set());
  const [isSavingToMemories, setIsSavingToMemories] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [chatToClear, setChatToClear] = useState(null);

  // Clear chat conversation
  const handleConfirmClearChat = async () => {
    if (!chatToClear) return;
    try {
      await clearChat(chatToClear.id);
      toast.success(`Cleared chat with ${chatToClear.name} 🗑️`);
      setChatToClear(null);
      setShowChatMenu(false);
    } catch {
      toast.error('Failed to clear chat.');
    }
  };

  // Delete single message
  const handleDeleteSingleMessage = async (friendId, messageId) => {
    try {
      await deleteMessage(friendId, messageId);
      toast.success('Message deleted', { duration: 1800 });
    } catch {
      toast.error('Failed to delete message.');
    }
  };

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

  // Disappearing snap timer (pauses when user holds or interacts)
  useEffect(() => {
    if (!viewingSnap || isPaused) return;

    const DURATION_SECONDS = viewingSnap.message.mediaType === 'video' ? 12 : 7;
    const intervalTime = 50;
    const step = (intervalTime / (DURATION_SECONDS * 1000)) * 100;

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
  }, [viewingSnap, isPaused]);

  const handleCloseSnap = () => {
    if (viewingSnap) {
      const isReplay = Boolean(viewingSnap.isReplay);
      openSnapMessage(viewingSnap.friendId, viewingSnap.message.id, isReplay);
      setViewingSnap(null);
      setIsPaused(false);
      setSnapReplyText('');
      if (isReplay) {
        toast('Replay finished • Snap disappeared permanently 💨', {
          icon: '👻',
          style: { background: '#141420', color: '#fff', border: '1px solid rgba(255,252,0,0.3)' },
        });
      } else {
        toast('Snap viewed! Replay available once 🔄', {
          icon: '✨',
          style: { background: '#141420', color: '#fff', border: '1px solid rgba(255,252,0,0.3)' },
        });
      }
    }
  };

  const handleOpenSnap = (friendId, msg) => {
    // If unopened
    if (!msg.opened && (msg.snapUrl || msg.originalSnapUrl)) {
      setViewingSnap({ friendId, message: msg, isReplay: false });
      setSnapCountdown(100);
      setIsPaused(false);
      setSnapReplyText('');
      return;
    }

    // If already opened, check if 1-time replay is available
    if (msg.opened && !msg.replayUsed && (msg.replayCount || 0) < 1 && (msg.snapUrl || msg.originalSnapUrl)) {
      handleTriggerReplay(friendId, msg);
      return;
    }

    toast('Snap already viewed and expired.', { icon: '🔒' });
  };

  // Trigger Replay (Strictly once per recipient)
  const handleTriggerReplay = async (friendId, msg) => {
    if (msg.replayUsed || (msg.replayCount && msg.replayCount >= 1)) {
      toast('Replay already used for this snap.', { icon: '🔒' });
      return;
    }

    const res = await replaySnapMessage(friendId, msg.id);
    if (res.success && res.message) {
      setViewingSnap({
        friendId,
        message: res.message,
        isReplay: true,
      });
      setSnapCountdown(100);
      setIsPaused(false);
      setSnapReplyText('');
      toast.success('Replaying Snap! 🔄 (1 Replay only)');
    } else {
      toast.error(res.error || 'Cannot replay snap');
    }
  };

  // Replay from inside viewer
  const handleReplayInViewer = async () => {
    if (!viewingSnap) return;
    if (
      viewingSnap.isReplay ||
      viewingSnap.message.replayUsed ||
      (viewingSnap.message.replayCount && viewingSnap.message.replayCount >= 1)
    ) {
      toast('Replay already used.', { icon: '🔒' });
      return;
    }

    const friendId = viewingSnap.friendId;
    const msgId = viewingSnap.message.id;
    const res = await replaySnapMessage(friendId, msgId);
    if (res.success && res.message) {
      setViewingSnap({
        friendId,
        message: res.message,
        isReplay: true,
      });
      setSnapCountdown(100);
      setIsPaused(false);
      toast.success('Replaying Snap! 🔄 (1 of 1)');
    }
  };

  // Save received snap to user's Memories collection
  const handleSaveToMemories = async (snapMsg, friend) => {
    const activeUrl = snapMsg.snapUrl || snapMsg.originalSnapUrl;
    if (!activeUrl) {
      toast.error('Media URL not found');
      return;
    }

    if (snapMsg.savedToMemories || savedSnapIds.has(snapMsg.id)) {
      toast('Already saved to Memories! ✨', { icon: '💾' });
      return;
    }

    setIsSavingToMemories(true);
    try {
      await saveMemory({
        type: snapMsg.mediaType || 'photo',
        url: activeUrl,
        dataUrl: activeUrl,
        title: `Snap from ${friend?.name || 'Friend'}`,
        filter: 'Original',
        isSnap: true,
        senderName: friend?.name || 'Friend',
        snapId: snapMsg.snapId || snapMsg.id,
      });

      await markSnapSavedLocally(friend?.id || viewingSnap?.friendId, snapMsg.id);
      setSavedSnapIds((prev) => new Set(prev).add(snapMsg.id));
      toast.success('Saved to Memories! 📸', {
        style: { background: '#141420', color: '#FFFC00', border: '1px solid #FFFC00' },
      });
    } catch (err) {
      console.error('Save to memories error:', err);
      toast.error('Failed to save to Memories.');
    } finally {
      setIsSavingToMemories(false);
    }
  };

  // Download original media to device
  const handleDownloadSnap = async (snapMsg) => {
    const activeUrl = snapMsg.snapUrl || snapMsg.originalSnapUrl;
    if (!activeUrl) {
      toast.error('Media not available to download.');
      return;
    }

    const isVideo = snapMsg.mediaType === 'video';
    const ext = isVideo ? 'mp4' : 'jpg';
    const fileName = `snaplens_${isVideo ? 'video' : 'photo'}_${Date.now()}.${ext}`;

    try {
      const response = await fetch(activeUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded to device! 📥');
    } catch (err) {
      const link = document.createElement('a');
      link.href = activeUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started! 📥');
    }
  };

  // Send quick text reply to Snap
  const handleSendSnapReply = (e) => {
    e.preventDefault();
    if (!snapReplyText.trim() || !viewingSnap) return;

    sendMessage(
      viewingSnap.friendId,
      snapReplyText.trim(),
      '',
      'photo',
      { replyToSnapId: viewingSnap.message.id }
    );
    toast.success('Reply sent! 💬');
    setSnapReplyText('');
  };

  // Instant Camera reply to Snap
  const handleCameraReply = () => {
    if (!viewingSnap) return;
    const friendId = viewingSnap.friendId;
    const snapId = viewingSnap.message.id;
    const isReplay = Boolean(viewingSnap.isReplay);
    openSnapMessage(friendId, snapId, isReplay);
    setViewingSnap(null);
    navigate('/camera', {
      state: {
        sendToFriendId: friendId,
        replyToSnapId: snapId,
      },
    });
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
    // Send as disappearing snap
    sendSnapToFriend(activeFriendId, {
      snapUrl: url,
      type: isVideo ? 'video' : 'photo',
      caption: isVideo ? 'Video Snap' : 'Photo Snap',
    });
    toast.success('Disappearing Snap sent! 🚀');
    if (mediaInputRef.current) mediaInputRef.current.value = '';
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

  // Received snaps across all friends (unread or replay available)
  const receivedSnaps = useMemo(() => {
    const list = [];
    friends.forEach((friend) => {
      (friend.messages || []).forEach((msg) => {
        if (msg.sender === 'them' && msg.type === 'snap') {
          const isUnread = !msg.opened && (msg.snapUrl || msg.originalSnapUrl);
          const hasReplay =
            msg.opened &&
            !msg.replayUsed &&
            (msg.replayCount || 0) < 1 &&
            (msg.snapUrl || msg.originalSnapUrl);
          if (isUnread || hasReplay) {
            list.push({
              friend,
              message: msg,
              isReplayAvailable: hasReplay,
            });
          }
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
                  onClick={() => navigate('/add-friends')}
                  className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center text-white/80 hover:text-[#FFFC00] hover:border-[#FFFC00]/40 transition-colors"
                  title="Add Friends"
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
                      {receivedSnaps.map(({ friend, message, isReplayAvailable }) => (
                        <div
                          key={message.id}
                          onClick={() => handleOpenSnap(friend.id, message)}
                          className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group"
                        >
                          <div
                            className={`relative p-0.5 rounded-full shadow-lg group-hover:scale-105 active:scale-95 transition-transform ${
                              isReplayAvailable
                                ? 'bg-gradient-to-tr from-amber-500 via-[#FFFC00] to-yellow-300 shadow-[#FFFC00]/20'
                                : 'bg-gradient-to-tr from-red-500 via-pink-500 to-[#FFFC00] shadow-red-500/20'
                            }`}
                          >
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-[#0E0E18]"
                            />
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md border border-[#0E0E18] ${
                                isReplayAvailable
                                  ? 'bg-[#FFFC00] text-black font-black'
                                  : 'bg-red-500 text-white'
                              }`}
                            >
                              {isReplayAvailable ? (
                                <RotateCcw className="w-2.5 h-2.5" />
                              ) : (
                                <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-white max-w-[68px] truncate text-center">
                            {friend.name.split(' ')[0]}
                          </span>
                          <span className="text-[9px] text-[#FFFC00] -mt-1 font-mono font-bold">
                            {isReplayAvailable ? 'Replay 🔄' : message.time || 'New'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {filteredFriends.length === 0 ? (
                  <div className="p-8 text-center text-xs text-white/40 flex flex-col items-center justify-center min-h-[240px]">
                    {searchQuery.trim() ? (
                      <p>No friends found matching "{searchQuery}"</p>
                    ) : (
                      <div className="flex flex-col items-center gap-3 max-w-xs">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FFFC00]">
                          <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white mb-1">No Friends Yet</h4>
                          <p className="text-[11px] text-white/50 leading-relaxed">
                            Search registered users or add friends by username handle to start chatting and sending Snaps!
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => navigate('/add-friends')}
                            className="px-4 py-1.5 rounded-full bg-[#FFFC00] text-black font-extrabold text-xs shadow-md shadow-[#FFFC00]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Friends</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isActive = activeFriendId === friend.id;
                    return (
                      <div
                        key={friend.id}
                        onClick={() => setActiveFriendId(friend.id)}
                        className={`group p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isActive ? 'bg-[#FFFC00]/10 border-l-4 border-l-[#FFFC00]' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/user/${friend.id}`);
                            }}
                            className="relative flex-shrink-0 hover:scale-105 transition-transform"
                            title={`View ${friend.name}'s profile`}
                          >
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-12 h-12 rounded-full object-cover border border-white/10 hover:border-[#FFFC00]"
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

                        {/* Quick Actions: Clear Chat & Camera */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setChatToClear(friend);
                            }}
                            className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title={`Clear chat with ${friend.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

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

                    <div
                      onClick={() => navigate(`/user/${activeFriend.id}`)}
                      className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer group"
                      title={`View ${activeFriend.name}'s profile`}
                    >
                      <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform">
                        <img
                          src={activeFriend.avatar}
                          alt={activeFriend.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#FFFC00]/60 ring-2 ring-black/40 group-hover:border-[#FFFC00]"
                        />
                        <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0A0A0F] absolute -bottom-0.5 -right-0.5 shadow-sm" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <h3 className="font-extrabold text-sm sm:text-base text-white truncate group-hover:text-[#FFFC00] transition-colors">
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

                    {/* Chat Options / Delete Chat Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setShowChatMenu((prev) => !prev)}
                        className={`w-8 h-8 rounded-full glass-pill flex items-center justify-center transition-colors ${
                          showChatMenu ? 'bg-white/20 text-[#FFFC00]' : 'text-white/70 hover:text-white'
                        }`}
                        title="Chat Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {showChatMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#141420] border border-white/15 shadow-2xl p-1.5 z-30">
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setChatToClear(activeFriend);
                            }}
                            className="w-full px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/15 rounded-xl flex items-center gap-2 transition-colors text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear Chat History</span>
                          </button>
                        </div>
                      )}
                    </div>
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
                        className={`group w-full flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1`}
                      >
                        {isSnap ? (
                          /* Disappearing Snap Message Card */
                          <div
                            onClick={() => handleOpenSnap(activeFriend.id, msg)}
                            className={`cursor-pointer rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-200 max-w-[290px] sm:max-w-xs shadow-lg ${
                              isMe
                                ? msg.opened
                                  ? 'bg-white/5 border border-white/10 opacity-70'
                                  : 'bg-[#FFFC00]/15 border border-[#FFFC00]/30 hover:border-[#FFFC00]/50 shadow-[#FFFC00]/5'
                                : !msg.opened
                                ? 'bg-gradient-to-r from-red-500/25 via-pink-500/20 to-purple-500/25 border border-red-500/40 hover:scale-105 active:scale-95 shadow-red-500/10'
                                : !msg.replayUsed && (msg.replayCount || 0) < 1 && (msg.snapUrl || msg.originalSnapUrl)
                                ? 'bg-gradient-to-r from-amber-500/20 via-[#FFFC00]/15 to-yellow-500/10 border border-[#FFFC00]/40 hover:border-[#FFFC00] hover:scale-105 active:scale-95 shadow-lg shadow-[#FFFC00]/10'
                                : 'bg-white/5 border border-white/10 opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  isMe
                                    ? msg.opened
                                      ? 'bg-white/10 text-white/50'
                                      : 'bg-[#FFFC00] text-black shadow-md shadow-[#FFFC00]/25'
                                    : !msg.opened
                                    ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                                    : !msg.replayUsed && (msg.replayCount || 0) < 1 && (msg.snapUrl || msg.originalSnapUrl)
                                    ? 'bg-[#FFFC00] text-black shadow-md shadow-[#FFFC00]/30'
                                    : 'bg-white/10 text-white/50'
                                }`}
                              >
                                {isMe ? (
                                  msg.opened ? <Eye className="w-5 h-5" /> : <Send className="w-4 h-4 ml-0.5" />
                                ) : !msg.opened ? (
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                ) : !msg.replayUsed && (msg.replayCount || 0) < 1 && (msg.snapUrl || msg.originalSnapUrl) ? (
                                  <RotateCcw className="w-5 h-5" />
                                ) : (
                                  <Eye className="w-5 h-5" />
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
                                    : !msg.opened
                                    ? 'New Disappearing Snap'
                                    : !msg.replayUsed && (msg.replayCount || 0) < 1 && (msg.snapUrl || msg.originalSnapUrl)
                                    ? 'Replay Available 🔄'
                                    : 'Snap Viewed'}
                                </span>
                                <span className="text-[11px] text-white/60 block truncate">
                                  {isMe
                                    ? msg.opened
                                      ? 'Opened by ' + activeFriend.name.split(' ')[0]
                                      : 'Delivered • Tap to preview'
                                    : !msg.opened
                                    ? 'Tap to view (Timed) 🔥'
                                    : !msg.replayUsed && (msg.replayCount || 0) < 1 && (msg.snapUrl || msg.originalSnapUrl)
                                    ? 'Tap to Replay Snap (1x)'
                                    : 'Replay Used 🔒 • Disappeared'}
                                </span>
                                {msg.savedToMemories && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-[#FFFC00] font-bold mt-0.5">
                                    <BookmarkCheck className="w-3 h-3" /> Saved in Memories
                                  </span>
                                )}
                              </div>
                            </div>

                            {!isMe && msg.opened && !msg.replayUsed && (msg.replayCount || 0) < 1 && (msg.snapUrl || msg.originalSnapUrl) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTriggerReplay(activeFriend.id, msg);
                                }}
                                className="px-2.5 py-1 rounded-full bg-[#FFFC00] text-black font-extrabold text-[10px] flex items-center gap-1 shadow-md shadow-[#FFFC00]/20 flex-shrink-0 hover:scale-105 active:scale-95"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Replay</span>
                              </button>
                            )}
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

                        <div className="flex items-center gap-1.5 mt-1 px-1">
                          <span className="text-[10px] text-white/40 font-mono">
                            {msg.time}
                          </span>
                          {isMe && (
                            <span className="text-[10px] text-[#FFFC00]/70 flex items-center">
                              <CheckCheck className="w-3 h-3" />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleMessage(activeFriend.id, msg.id)}
                            className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-white/30 hover:text-red-400 p-0.5 rounded transition-all ml-1"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
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

      {/* Disappearing Snap Viewer Modal with Countdown Progress, Replay, Save, and Reply */}
      <AnimatePresence>
        {viewingSnap && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 select-none"
          >
            {(() => {
              const snapSender = friends.find((f) => f.id === viewingSnap.friendId);
              const isSaved =
                viewingSnap.message.savedToMemories ||
                savedSnapIds.has(viewingSnap.message.id);
              const isReplayUsed =
                viewingSnap.isReplay ||
                viewingSnap.message.replayUsed ||
                (viewingSnap.message.replayCount && viewingSnap.message.replayCount >= 1);

              return (
                <div
                  className="relative w-full h-full sm:max-w-md sm:max-h-[95vh] sm:rounded-3xl overflow-hidden border-0 sm:border sm:border-white/20 shadow-2xl flex flex-col justify-between bg-black"
                  onMouseDown={() => setIsPaused(true)}
                  onMouseUp={() => setIsPaused(false)}
                  onTouchStart={() => setIsPaused(true)}
                  onTouchEnd={() => setIsPaused(false)}
                >
                  {/* Countdown Progress Bar at Top */}
                  <div className="absolute top-3 left-3 right-3 z-40 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-75 shadow-sm ${
                          viewingSnap.isReplay
                            ? 'bg-amber-400 shadow-amber-400'
                            : 'bg-[#FFFC00] shadow-[#FFFC00]'
                        }`}
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
                  <div className="absolute top-8 left-3 right-3 z-40 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2.5 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg pointer-events-auto">
                      <img
                        src={
                          snapSender?.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                        }
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

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      {viewingSnap.isReplay ? (
                        <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[10px] shadow-lg flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          <span>REPLAY (1x)</span>
                        </span>
                      ) : (
                        <span className="bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono font-bold text-[#FFFC00] shadow-lg">
                          {viewingSnap.message.mediaType === 'video' ? 'VIDEO SNAP' : 'PHOTO SNAP'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Paused Indicator */}
                  {isPaused && (
                    <div className="absolute top-20 left-1/2 -translate-y-0 -translate-x-1/2 z-30 pointer-events-none">
                      <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-[#FFFC00]/40 text-xs font-bold text-[#FFFC00] flex items-center gap-1.5 shadow-lg">
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Holding to Pause</span>
                      </span>
                    </div>
                  )}

                  {/* Media Container */}
                  <div className="relative w-full flex-1 flex items-center justify-center bg-black overflow-hidden">
                    {viewingSnap.message.mediaType === 'video' ? (
                      <video
                        src={viewingSnap.message.snapUrl || viewingSnap.message.originalSnapUrl}
                        autoPlay
                        playsInline
                        loop={Boolean(viewingSnap.isReplay)}
                        className="w-full h-full object-contain max-h-[82vh]"
                      />
                    ) : (
                      <img
                        src={viewingSnap.message.snapUrl || viewingSnap.message.originalSnapUrl}
                        alt="Snap"
                        className="w-full h-full object-contain max-h-[82vh]"
                      />
                    )}
                  </div>

                  {/* Caption Overlay */}
                  {viewingSnap.message.caption && (
                    <div className="absolute bottom-28 left-4 right-4 z-30 text-center pointer-events-none">
                      <span className="inline-block px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold text-white shadow-xl">
                        {viewingSnap.message.caption}
                      </span>
                    </div>
                  )}

                  {/* ── PREMIUM BOTTOM ACTION DOCK ── */}
                  <div
                    className="relative z-40 bg-gradient-to-t from-black via-black/90 to-transparent pt-6 pb-4 px-3 sm:px-4 flex flex-col gap-2.5 pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Actions Row: Replay, Save to Memories, Download */}
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                      {/* 1. Replay Button */}
                      {!isReplayUsed ? (
                        <button
                          type="button"
                          onClick={handleReplayInViewer}
                          className="px-3 py-1.5 rounded-full bg-[#FFFC00] text-black font-extrabold text-[11px] sm:text-xs flex items-center gap-1 shadow-lg shadow-[#FFFC00]/25 hover:scale-105 active:scale-95 transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Replay Snap</span>
                        </button>
                      ) : (
                        <div className="px-3 py-1.5 rounded-full bg-white/10 text-white/40 font-semibold text-[11px] sm:text-xs flex items-center gap-1 cursor-not-allowed">
                          <RotateCcw className="w-3 h-3 opacity-40" />
                          <span>Replay Used</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        {/* 2. Save to Memories Button */}
                        {isSaved ? (
                          <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] sm:text-xs flex items-center gap-1">
                            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Saved ✓</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isSavingToMemories}
                            onClick={() => handleSaveToMemories(viewingSnap.message, snapSender)}
                            className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 border border-white/20 transition-all active:scale-95"
                          >
                            {isSavingToMemories ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Bookmark className="w-3.5 h-3.5" />
                            )}
                            <span>Save to Memories</span>
                          </button>
                        )}

                        {/* 3. Download to Device Button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadSnap(viewingSnap.message)}
                          className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 border border-white/20 transition-all active:scale-95"
                          title="Download original media to device"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden xs:inline">Download</span>
                        </button>
                      </div>
                    </div>

                    {/* Reply Bar */}
                    <form onSubmit={handleSendSnapReply} className="flex items-center gap-2 w-full">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder={`Send a chat to ${
                            snapSender?.name ? snapSender.name.split(' ')[0] : 'friend'
                          }...`}
                          value={snapReplyText}
                          onFocus={() => setIsPaused(true)}
                          onBlur={() => setIsPaused(false)}
                          onChange={(e) => setSnapReplyText(e.target.value)}
                          className="w-full pl-4 pr-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#FFFC00]"
                        />
                      </div>

                      {snapReplyText.trim() ? (
                        <button
                          type="submit"
                          className="w-8 h-8 rounded-full bg-[#FFFC00] text-black flex items-center justify-center font-bold shadow-lg shadow-[#FFFC00]/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                          title="Send Reply"
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCameraReply}
                          className="w-8 h-8 rounded-full bg-[#FFFC00] text-black flex items-center justify-center font-bold shadow-lg shadow-[#FFFC00]/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                          title="Reply with Camera Snap"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      )}
                    </form>
                  </div>
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

      {/* Clear Chat Confirmation Modal */}
      <AnimatePresence>
        {chatToClear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass-panel rounded-3xl p-6 border border-white/15 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Clear Chat History?
              </h3>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                Are you sure you want to delete all messages and Snaps with <span className="text-white font-bold">{chatToClear.name}</span>? This action cannot be undone.
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setChatToClear(null)}
                  className="flex-1 py-2.5 rounded-xl glass-pill text-xs font-bold text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearChat}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Chat</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
