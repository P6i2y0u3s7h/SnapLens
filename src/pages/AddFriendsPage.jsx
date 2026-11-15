import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  MessageSquare,
  Trash2,
  Sparkles,
  ArrowLeft,
  Users,
  Flame,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import Header from '../components/Header';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AddFriendsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    friends,
    friendRequests,
    sentRequests,
    quickAddSuggestions,
    isLoadingQuickAdd,
    refreshQuickAdd,
    searchUsers,
    searchResults,
    isSearching,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getRequestStatus,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [myFriendsFilter, setMyFriendsFilter] = useState('');
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [processingUserIds, setProcessingUserIds] = useState(new Set());

  // Debounced search for Firestore users
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) return;

    const timer = setTimeout(() => {
      searchUsers(q);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Handle Add Friend Action
  const handleAddFriend = async (targetUser) => {
    const targetId = targetUser.id || targetUser.uid;
    if (processingUserIds.has(targetId)) return;

    setProcessingUserIds((prev) => new Set(prev).add(targetId));
    try {
      const res = await sendFriendRequest(targetUser);
      if (res.autoAccepted) {
        toast.success(`You and ${targetUser.name || 'Friend'} are now friends! 🎉`, {
          icon: '🤝',
        });
      } else if (res.success) {
        toast.success(`Friend request sent to ${targetUser.name || 'User'}! 🚀`);
      } else {
        toast.error(res.error || 'Failed to send friend request');
      }
    } catch {
      toast.error('Could not send friend request.');
    } finally {
      setProcessingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  // Handle Accept Friend Request
  const handleAccept = async (request) => {
    try {
      const res = await acceptFriendRequest(request.id);
      if (res.success) {
        toast.success(`Accepted friend request from ${request.senderName}! 💛`, {
          icon: '✨',
        });
      }
    } catch {
      toast.error('Failed to accept request.');
    }
  };

  // Handle Reject Friend Request
  const handleReject = async (requestId, senderName) => {
    try {
      await rejectFriendRequest(requestId);
      toast('Friend request removed', { icon: '👋' });
    } catch {
      toast.error('Failed to remove request.');
    }
  };

  // Confirm Friend Removal
  const handleConfirmRemove = async () => {
    if (!friendToRemove) return;
    try {
      await removeFriend(friendToRemove.id);
      toast.success(`Removed ${friendToRemove.name} from friends`);
      setFriendToRemove(null);
    } catch {
      toast.error('Failed to remove friend.');
    }
  };

  // Open Chat with specific friend
  const handleOpenChat = (friend) => {
    navigate('/chat', { state: { sendToFriendId: friend.id, activeFriendId: friend.id } });
  };

  // Filter local accepted friends
  const filteredMyFriends = useMemo(() => {
    if (!myFriendsFilter.trim()) return friends;
    const q = myFriendsFilter.toLowerCase().trim();
    return friends.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.handle?.toLowerCase().includes(q)
    );
  }, [friends, myFriendsFilter]);

  return (
    <div className="min-h-dvh bg-[#0A0A0F] text-white flex flex-col pb-24 sm:pb-28">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto pt-20 px-3 sm:px-6">
        {/* Top Header Card */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="w-10 h-10 rounded-2xl glass-pill flex items-center justify-center text-white/80 hover:text-white hover:border-[#FFFC00] transition-colors"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Add Friends</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFFC00] shadow-sm shadow-[#FFFC00]" />
              </h1>
              <p className="text-xs sm:text-sm text-white/50">
                Find your friends and connect on SnapLens.
              </p>
            </div>
          </div>

          <button
            onClick={() => refreshQuickAdd()}
            className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center text-white/60 hover:text-[#FFFC00] transition-colors"
            title="Refresh suggestions"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* ── 1. SEARCH BAR ── */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by username or display name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/35 focus:outline-none focus:border-[#FFFC00] focus:ring-1 focus:ring-[#FFFC00]/30 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── 2. SEARCH RESULTS (Active Search View) ── */}
        {searchQuery.trim().length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                <span>Search Results</span>
                {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFFC00]" />}
              </h3>
              <span className="text-xs text-white/40">
                {searchResults.length} user{searchResults.length === 1 ? '' : 's'}
              </span>
            </div>

            {isSearching ? (
              <div className="py-12 glass-panel rounded-2xl flex flex-col items-center justify-center gap-2 text-white/40 border border-white/10">
                <Loader2 className="w-6 h-6 animate-spin text-[#FFFC00]" />
                <span className="text-xs">Searching SnapLens users...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-12 glass-panel rounded-2xl text-center border border-white/10 p-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/30">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">No users found</h4>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  We couldn’t find anyone matching "{searchQuery}". Try searching for their exact username or name.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {searchResults.map((user) => {
                  const status = getRequestStatus(user.id || user.uid);
                  const isProcessing = processingUserIds.has(user.id || user.uid);

                  return (
                    <motion.div
                      key={user.id || user.uid}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 glass-panel rounded-2xl border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            user.avatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id || user.uid}`
                          }
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/10 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">
                            {user.name}
                          </h4>
                          <p className="text-xs text-white/50 font-mono truncate">
                            @{user.handle}
                          </p>
                        </div>
                      </div>

                      {/* State Button */}
                      <div>
                        {status === 'friends' ? (
                          <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Friends</span>
                          </div>
                        ) : status === 'requested' ? (
                          <div className="px-3.5 py-1.5 rounded-full bg-[#FFFC00]/15 border border-[#FFFC00]/30 text-[#FFFC00] font-bold text-xs flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Requested</span>
                          </div>
                        ) : status === 'received' ? (
                          <button
                            onClick={() => {
                              const req = friendRequests.find(
                                (r) => r.senderId === (user.id || user.uid)
                              );
                              if (req) handleAccept(req);
                            }}
                            className="btn-snap px-4 py-1.5 rounded-full text-xs font-black text-black flex items-center gap-1.5 shadow-md shadow-[#FFFC00]/25 hover:scale-105 active:scale-95 transition-all"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Accept</span>
                          </button>
                        ) : (
                          <button
                            disabled={isProcessing}
                            onClick={() => handleAddFriend(user)}
                            className="btn-snap px-4 py-1.5 rounded-full text-xs font-black text-black flex items-center gap-1.5 shadow-md shadow-[#FFFC00]/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            <span>+ Add</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── 3. FRIEND REQUESTS (Incoming) ── */}
        {friendRequests.length > 0 && !searchQuery.trim() && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Friend Requests</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {friendRequests.length}
                </span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {friendRequests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 glass-panel rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex items-center justify-between gap-3 shadow-lg shadow-amber-500/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        req.senderAvatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${req.senderId}`
                      }
                      alt={req.senderName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400/60 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">
                        {req.senderName}
                      </h4>
                      <p className="text-xs text-white/50 font-mono truncate">
                        @{req.senderHandle} • {req.time || 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(req)}
                      className="btn-snap px-4 py-1.5 rounded-full text-xs font-black text-black flex items-center gap-1.5 shadow-md shadow-[#FFFC00]/25 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleReject(req.id, req.senderName)}
                      className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      title="Reject request"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. QUICK ADD SECTION ── */}
        {!searchQuery.trim() && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFFC00]" />
                <span>QUICK ADD</span>
              </h3>
              {isLoadingQuickAdd && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFFC00]" />
              )}
            </div>

            {isLoadingQuickAdd && quickAddSuggestions.length === 0 ? (
              <div className="py-10 glass-panel rounded-2xl flex items-center justify-center text-white/40 gap-2 border border-white/10">
                <Loader2 className="w-5 h-5 animate-spin text-[#FFFC00]" />
                <span className="text-xs">Finding suggested friends...</span>
              </div>
            ) : quickAddSuggestions.length === 0 ? (
              <div className="py-8 glass-panel rounded-2xl text-center border border-white/10 p-4 text-xs text-white/40">
                No new suggestions at the moment. Use the search bar above to find friends!
              </div>
            ) : (
              <div className="space-y-2.5">
                {quickAddSuggestions.map((user) => {
                  const status = getRequestStatus(user.id || user.uid);
                  const isProcessing = processingUserIds.has(user.id || user.uid);

                  return (
                    <div
                      key={user.id || user.uid}
                      className="p-3.5 glass-panel rounded-2xl border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            user.avatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id || user.uid}`
                          }
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">
                            {user.name}
                          </h4>
                          <p className="text-xs text-white/50 font-mono truncate">
                            @{user.handle}
                          </p>
                          {user.mutualCount > 0 && (
                            <span className="text-[10px] text-white/40 font-medium block truncate mt-0.5">
                              {user.mutualCount} mutual friend{user.mutualCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Add Button */}
                      <div>
                        {status === 'requested' ? (
                          <div className="px-3.5 py-1.5 rounded-full bg-[#FFFC00]/15 border border-[#FFFC00]/30 text-[#FFFC00] font-bold text-xs flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Requested</span>
                          </div>
                        ) : (
                          <button
                            disabled={isProcessing}
                            onClick={() => handleAddFriend(user)}
                            className="btn-snap px-4 py-1.5 rounded-full text-xs font-black text-black flex items-center gap-1.5 shadow-md shadow-[#FFFC00]/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            <span>+ Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── 5. MY FRIENDS SECTION ── */}
        {!searchQuery.trim() && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#FFFC00]" />
                <span>My Friends ({friends.length})</span>
              </h3>
            </div>

            {/* Local Friends Search Filter */}
            {friends.length > 5 && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Filter your friends..."
                  value={myFriendsFilter}
                  onChange={(e) => setMyFriendsFilter(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFFC00]"
                />
              </div>
            )}

            {filteredMyFriends.length === 0 ? (
              <div className="py-10 glass-panel rounded-2xl text-center border border-white/10 p-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/30">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {myFriendsFilter ? 'No friends match your filter' : 'No Friends Added Yet'}
                </h4>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  {myFriendsFilter
                    ? 'Check the spelling of your friend’s name.'
                    : 'Search registered users above or connect with friends using Quick Add to start snapping!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredMyFriends.map((friend) => (
                  <div
                    key={friend.id || friend.uid}
                    className="p-3.5 glass-panel rounded-2xl border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400/40 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white truncate">
                            {friend.name}
                          </h4>
                          {friend.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                              <Flame className="w-3 h-3 fill-current text-amber-500" />
                              <span>{friend.streak}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 font-mono truncate">
                          @{friend.handle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleOpenChat(friend)}
                        className="btn-snap px-3 py-1.5 rounded-full text-xs font-black text-black flex items-center gap-1.5 shadow-md shadow-[#FFFC00]/25 hover:scale-105 active:scale-95 transition-all"
                        title="Open Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                      <button
                        onClick={() => setFriendToRemove(friend)}
                        className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-500/30 transition-colors"
                        title="Remove Friend"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── FRIEND REMOVAL CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {friendToRemove && (
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
                Remove {friendToRemove.name}?
              </h3>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                Are you sure you want to remove @{friendToRemove.handle} from your friends list? You will no longer receive their personal Snaps.
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setFriendToRemove(null)}
                  className="flex-1 py-2.5 rounded-xl glass-pill text-xs font-bold text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
