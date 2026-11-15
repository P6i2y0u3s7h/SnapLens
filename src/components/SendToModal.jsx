import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Check,
  Send,
  Flame,
  Users,
  Play,
  Image as ImageIcon,
  CheckCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useStories } from '../hooks/useStories';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * Premium Snapchat-Inspired "Send To" Modal
 * Responsive across mobile (320px–430px), tablet, and desktop viewports.
 * Supports:
 * - Single and multi-friend selection with synced checkboxes
 * - "Select All" / "Deselect All" aligned with Friends section
 * - Responsive search by name / @username
 * - Selected friends avatar tray with 1-tap remove
 * - Captured media preview with non-truncated description
 * - Single upload to Firebase Storage & multi-recipient Firestore delivery
 * - Mobile safe-area inset aware fixed bottom Send button
 */
export default function SendToModal({
  isOpen,
  onClose,
  mediaUrl,
  dataUrl,
  fileBlob,
  mediaType = 'photo',
  caption = '',
  onSent,
}) {
  const { friends, sendSnapToMultipleFriends } = useChat();
  const { addSnapToMyStory } = useStories();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [sendToStory, setSendToStory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.handle.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  // Target friends for selection (scoped to search results if searching, otherwise all friends)
  const targetFriends = searchQuery.trim() ? filteredFriends : friends;
  const isAllSelected =
    targetFriends.length > 0 &&
    targetFriends.every((f) => selectedFriendIds.includes(f.id));

  // Toggle single friend selection
  const handleToggleFriend = (friendId) => {
    if (isSending) return;
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Quick remove friend from avatar tray
  const handleRemoveFriend = (friendId, e) => {
    e.stopPropagation();
    if (isSending) return;
    setSelectedFriendIds((prev) => prev.filter((id) => id !== friendId));
  };

  // Toggle Select All (operates on target friends, does not affect My Story)
  const handleToggleSelectAll = () => {
    if (isSending || targetFriends.length === 0) return;
    if (isAllSelected) {
      const targetIds = new Set(targetFriends.map((f) => f.id));
      setSelectedFriendIds((prev) => prev.filter((id) => !targetIds.has(id)));
    } else {
      const targetIds = targetFriends.map((f) => f.id);
      setSelectedFriendIds((prev) => Array.from(new Set([...prev, ...targetIds])));
    }
  };

  // Send Snap handler
  const handleSendSnap = async () => {
    if (isSending || (selectedFriendIds.length === 0 && !sendToStory)) return;

    setIsSending(true);
    setUploadProgress(15);

    try {
      // 1. Add to My Story if selected
      if (sendToStory) {
        addSnapToMyStory({
          type: mediaType,
          url: mediaUrl || dataUrl,
          fileBlob: fileBlob || null,
          caption: caption || '',
          duration: mediaType === 'video' ? 10 : 5,
        });
      }

      // 2. Send snap to all selected friends (uploaded once to storage, distributed to recipients)
      if (selectedFriendIds.length > 0) {
        await sendSnapToMultipleFriends(selectedFriendIds, {
          snapUrl: mediaUrl,
          dataUrl,
          fileBlob,
          type: mediaType,
          caption,
          onProgress: (p) => setUploadProgress(p),
        });
      }

      setUploadProgress(100);
      setIsSuccess(true);

      const count = selectedFriendIds.length;
      const targetLabel =
        count > 0 && sendToStory
          ? `${count} friend${count > 1 ? 's' : ''} & My Story`
          : count > 0
          ? `${count} friend${count > 1 ? 's' : ''}`
          : 'My Story';

      toast.success(`Snap sent to ${targetLabel}! 🔥`, {
        icon: '🚀',
        duration: 3500,
      });

      // Brief pause to display success state before closing
      setTimeout(() => {
        setIsSending(false);
        setIsSuccess(false);
        setSelectedFriendIds([]);
        setSendToStory(false);
        onClose();
        if (onSent) {
          onSent({
            recipientIds: selectedFriendIds,
            sentToStory,
            primaryFriendId: selectedFriendIds[0] || null,
          });
        }
      }, 700);
    } catch (err) {
      console.error('Failed to send snap:', err);
      toast.error('Failed to send snap. Please try again.');
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const totalSelected = selectedFriendIds.length + (sendToStory ? 1 : 0);
  const friendCount = selectedFriendIds.length;
  const previewSource = mediaUrl || dataUrl;

  // Dynamic button label computation matching all requested cases
  const getButtonText = () => {
    if (isSending) {
      const targetLabel =
        friendCount > 0 && sendToStory
          ? `${friendCount} friend${friendCount > 1 ? 's' : ''} & Story`
          : friendCount > 0
          ? `${friendCount} friend${friendCount > 1 ? 's' : ''}`
          : 'Story';
      return `Sending Snap to ${targetLabel}...`;
    }
    if (isSuccess) {
      return 'Snap Sent Successfully!';
    }
    if (friendCount === 0 && !sendToStory) {
      return 'Select Friends to Send';
    }
    if (friendCount === 0 && sendToStory) {
      return 'Share to Story';
    }
    if (friendCount > 0 && sendToStory) {
      const friendLabel = friendCount === 1 ? '1 Friend' : `${friendCount} Friends`;
      return `Send to ${friendLabel} & Story`;
    }
    if (friendCount === 1) {
      return 'Send to 1 Friend';
    }
    return `Send to ${friendCount} Friends`;
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none overscroll-none"
        onClick={() => !isSending && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="bg-[#0E0E18] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg h-[94dvh] sm:h-auto sm:max-h-[86vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── 1. HEADER ── */}
          <div className="px-4 py-3 sm:py-3.5 border-b border-white/10 flex items-center justify-between bg-[#141422]/95 backdrop-blur-md flex-shrink-0 gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-[#FFFC00] flex items-center justify-center text-black shadow-md flex-shrink-0">
                <Send className="w-4 h-4 ml-0.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Send To</span>
                  {selectedFriendIds.length > 0 && (
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFFC00] text-black whitespace-nowrap">
                      {selectedFriendIds.length} Selected
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-white/50 leading-tight mt-0.5 break-words line-clamp-1 sm:line-clamp-none">
                  Select friends or story to share your Snap
                </p>
              </div>
            </div>

            <button
              onClick={() => !isSending && onClose()}
              disabled={isSending}
              className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-white/70 hover:text-white transition-all disabled:opacity-40 flex-shrink-0 ml-auto"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── 2. MEDIA PREVIEW SECTION (No Description Truncation) ── */}
          <div className="px-4 py-2.5 sm:py-3 bg-white/3 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
            {previewSource && (
              <div className="relative w-12 h-14 sm:w-14 sm:h-16 rounded-xl overflow-hidden bg-black/60 border border-white/15 flex-shrink-0 shadow-md aspect-[3/4]">
                {mediaType === 'video' ? (
                  <video
                    src={previewSource}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={previewSource}
                    alt="Snap Preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-0.5 right-0.5 bg-black/75 backdrop-blur-xs rounded px-1 py-0.2 text-[8px] sm:text-[9px] font-bold text-[#FFFC00]">
                  {mediaType === 'video' ? 'VIDEO' : 'SNAP'}
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFFC00] flex-shrink-0" />
                <span className="truncate">
                  {caption ? caption : mediaType === 'video' ? 'Live Video Snap' : 'Photo Snap'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-white/50 leading-snug break-words">
                Uploads once • Delivered instantly to all selected recipients
              </p>
            </div>
          </div>

          {/* ── 3. SEARCH BAR & SELECT ALL ── */}
          <div className="p-3 sm:px-4 sm:py-3 border-b border-white/5 space-y-2 flex-shrink-0 bg-[#0E0E18]">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search friends by name or @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSending}
                className="w-full pl-9 pr-9 py-2 sm:py-2.5 rounded-2xl bg-white/6 border border-white/10 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FFFC00] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Friends Heading & Select All aligned */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Friends ({filteredFriends.length})
              </span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={isSending || targetFriends.length === 0}
                className="text-xs font-bold text-[#FFFC00] hover:underline disabled:opacity-40"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* ── 4. SELECTED FRIENDS AVATAR TRAY ── */}
          {selectedFriendIds.length > 0 && (
            <div className="px-3 sm:px-4 py-2 bg-[#121220] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar touch-scroll-x flex-shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40 pl-1 flex-shrink-0">
                To:
              </span>
              {selectedFriendIds.map((friendId) => {
                const friend = friends.find((f) => f.id === friendId);
                if (!friend) return null;
                return (
                  <motion.div
                    key={friend.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex-shrink-0 flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-[#FFFC00]/15 border border-[#FFFC00]/40 text-white text-xs font-semibold"
                  >
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="max-w-[80px] truncate text-[11px]">
                      {friend.name.split(' ')[0]}
                    </span>
                    <button
                      onClick={(e) => handleRemoveFriend(friend.id, e)}
                      disabled={isSending}
                      className="w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white ml-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── 5. INDEPENDENT SCROLLABLE BODY (Story & Friends) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain p-3 sm:p-4 space-y-2 divide-y divide-white/5">
            {/* My Story Selection Row */}
            <div
              onClick={() => !isSending && setSendToStory(!sendToStory)}
              className={`p-3 sm:px-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                sendToStory
                  ? 'bg-[#FFFC00]/15 border-[#FFFC00]/60 shadow-lg shadow-[#FFFC00]/5'
                  : 'bg-white/4 border-white/8 hover:bg-white/8'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-[#FFFC00] p-0.5 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-[#0E0E18] flex items-center justify-center">
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFFC00] fill-current ml-0.5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                    <span>My Story</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                      24h
                    </span>
                  </h4>
                  <p className="text-[11px] text-white/50 leading-tight truncate">
                    Share publicly with all your friends
                  </p>
                </div>
              </div>

              {/* Checkbox */}
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                  sendToStory
                    ? 'bg-[#FFFC00] text-black shadow-md'
                    : 'border-2 border-white/30 bg-white/5 hover:border-white/50'
                }`}
              >
                {sendToStory && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* Friends Rows */}
            {filteredFriends.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-xs">
                {searchQuery.trim() ? (
                  `No friends found matching "${searchQuery}"`
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-4">
                    <p className="text-white/70 font-bold text-xs">No friends added yet</p>
                    <p className="text-[11px] text-white/40 max-w-xs">
                      Add friends in the Chat tab to send personal snaps, or share to My Story above!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = selectedFriendIds.includes(friend.id);

                return (
                  <div
                    key={friend.id}
                    onClick={() => handleToggleFriend(friend.id)}
                    className={`pt-2 p-3 sm:px-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#FFFC00]/15 border-[#FFFC00]/60 shadow-md shadow-[#FFFC00]/5'
                        : 'bg-white/3 border-transparent hover:bg-white/6 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      {/* Avatar with status indicator */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-white/15"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0E0E18] absolute bottom-0 right-0" />
                      </div>

                      {/* Name, Handle, Streak */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">
                            {friend.name}
                          </h4>
                          {friend.streak > 0 && (
                            <span className="flex items-center text-[10px] font-black text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded-full border border-amber-500/30 flex-shrink-0">
                              <Flame className="w-2.5 h-2.5 fill-current text-amber-500 mr-0.5" />
                              <span>{friend.streak}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/50 font-mono truncate">
                          @{friend.handle}
                        </p>
                      </div>
                    </div>

                    {/* Snapchat Checkbox: ☑ or ☐ */}
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#FFFC00] text-black shadow-md scale-105'
                          : 'border-2 border-white/30 bg-white/5 hover:border-white/50'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── 6. FIXED BOTTOM SEND BUTTON (Mobile Safe Area Aware) ── */}
          <div className="p-3.5 sm:p-4 bg-[#141422]/95 backdrop-blur-md border-t border-white/10 flex-shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-4">
            {/* Progress bar during cloud upload */}
            {isSending && (
              <div className="w-full bg-white/10 rounded-full h-1.5 mb-2.5 overflow-hidden">
                <motion.div
                  className="bg-[#FFFC00] h-full rounded-full"
                  initial={{ width: '10%' }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            <button
              onClick={handleSendSnap}
              disabled={isSending || (selectedFriendIds.length === 0 && !sendToStory)}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isSending
                  ? 'bg-white/15 text-white/60 cursor-not-allowed'
                  : isSuccess
                  ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/30 scale-100'
                  : selectedFriendIds.length > 0 || sendToStory
                  ? 'bg-[#FFFC00] text-black shadow-xl shadow-[#FFFC00]/30 hover:scale-[1.01]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
              }`}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white flex-shrink-0" />
                  <span className="truncate">{getButtonText()}</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCheck className="w-5 h-5 stroke-[2.5] flex-shrink-0" />
                  <span>Snap Sent Successfully!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-0.5 flex-shrink-0" />
                  <span className="truncate">{getButtonText()}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
