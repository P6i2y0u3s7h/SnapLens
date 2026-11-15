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
 * Supports:
 * - Single and multi-friend selection with checkboxes
 * - "Select All" / "Deselect All"
 * - Live search by name / @username
 * - Selected friends avatar tray with 1-tap remove
 * - Captured media preview thumbnail (photo or video)
 * - Single upload to Firebase Storage & multi-recipient Firestore delivery
 * - Progress tracking & anti-duplicate protection
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

  // Toggle Select All
  const handleToggleSelectAll = () => {
    if (isSending) return;
    if (selectedFriendIds.length === friends.length) {
      setSelectedFriendIds([]);
    } else {
      setSelectedFriendIds(friends.map((f) => f.id));
    }
  };

  // Send Snap handler
  const handleSendSnap = async () => {
    if (isSending || (selectedFriendIds.length === 0 && !sendToStory)) return;

    setIsSending(true);
    setUploadProgress(15);

    try {
      // Optional: Add to My Story if selected
      if (sendToStory) {
        addSnapToMyStory({
          type: mediaType,
          url: mediaUrl || dataUrl,
          caption: caption || '',
          duration: mediaType === 'video' ? 10 : 5,
        });
      }

      // Send snap to all selected friends
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
  const isAllSelected = friends.length > 0 && selectedFriendIds.length === friends.length;
  const previewSource = mediaUrl || dataUrl;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
        onClick={() => !isSending && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="bg-[#0E0E18] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── HEADER ── */}
          <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#141422]/90 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FFFC00] flex items-center justify-center text-black shadow-md">
                <Send className="w-4 h-4 ml-0.5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Send To</span>
                  {selectedFriendIds.length > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFFC00] text-black">
                      {selectedFriendIds.length} Selected
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-white/50">
                  Select friends or story to share your Snap
                </p>
              </div>
            </div>

            <button
              onClick={() => !isSending && onClose()}
              disabled={isSending}
              className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-white/70 hover:text-white transition-all disabled:opacity-40"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── MEDIA PREVIEW CHIP & CAPTION (Single Upload Indicator) ── */}
          <div className="px-4 py-3 bg-white/3 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
            {previewSource && (
              <div className="relative w-12 h-14 rounded-xl overflow-hidden bg-black/60 border border-white/15 flex-shrink-0 shadow-md">
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
                <div className="absolute bottom-0.5 right-0.5 bg-black/70 backdrop-blur-xs rounded px-1 py-0.2 text-[9px] font-bold text-[#FFFC00]">
                  {mediaType === 'video' ? 'VIDEO' : 'SNAP'}
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
                <Sparkles className="w-3.5 h-3.5 text-[#FFFC00] flex-shrink-0" />
                <span className="truncate">
                  {caption ? caption : mediaType === 'video' ? 'Live Video Snap' : 'Photo Snap'}
                </span>
              </div>
              <p className="text-[10px] text-white/40 mt-0.5 font-mono truncate">
                Uploads once • Sent to all selected recipients
              </p>
            </div>
          </div>

          {/* ── SEARCH INPUT & SELECT ALL BAR ── */}
          <div className="p-3 border-b border-white/5 space-y-2 flex-shrink-0 bg-[#0E0E18]">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search friends by name or @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSending}
                className="w-full pl-9 pr-9 py-2 rounded-2xl bg-white/6 border border-white/10 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FFFC00] transition-colors"
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

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Friends ({filteredFriends.length})
              </span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={isSending || friends.length === 0}
                className="text-xs font-bold text-[#FFFC00] hover:underline disabled:opacity-40"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* ── SELECTED FRIENDS TRAY (Horizontal Scrollable Avatar Chips) ── */}
          {selectedFriendIds.length > 0 && (
            <div className="px-3 py-2 bg-[#121220] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar touch-scroll-x flex-shrink-0">
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

          {/* ── FRIENDS & STORY LIST (Scrollable) ── */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2 min-h-48 divide-y divide-white/5">
            {/* Option: My Story Toggle */}
            <div
              onClick={() => !isSending && setSendToStory(!sendToStory)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                sendToStory
                  ? 'bg-[#FFFC00]/15 border-[#FFFC00]/60 shadow-lg shadow-[#FFFC00]/5'
                  : 'bg-white/4 border-white/8 hover:bg-white/8'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-[#FFFC00] p-0.5 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-[#0E0E18] flex items-center justify-center">
                    <Play className="w-5 h-5 text-[#FFFC00] fill-current ml-0.5" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>My Story</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                      24h
                    </span>
                  </h4>
                  <p className="text-[11px] text-white/50">
                    Share publicly with all your friends
                  </p>
                </div>
              </div>

              {/* Checkbox */}
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                  sendToStory
                    ? 'bg-[#FFFC00] text-black shadow-md'
                    : 'border-2 border-white/30 bg-white/5'
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
                    className={`pt-2 p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FFFC00]/15 border-[#FFFC00]/60 shadow-md shadow-[#FFFC00]/5'
                        : 'bg-white/3 border-transparent hover:bg-white/6 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar with status indicator */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-11 h-11 rounded-full object-cover border border-white/15"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0E0E18] absolute bottom-0 right-0" />
                      </div>

                      {/* Name, Handle, Streak */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
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

          {/* ── BOTTOM STICKY BAR: PROMISING YELLOW SEND BUTTON ── */}
          <div className="p-3 sm:p-4 bg-[#141422] border-t border-white/10 flex-shrink-0 pb-safe">
            {/* Progress bar during cloud upload */}
            {isSending && (
              <div className="w-full bg-white/10 rounded-full h-1.5 mb-2 overflow-hidden">
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
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 ${
                isSending
                  ? 'bg-white/15 text-white/60 cursor-not-allowed'
                  : isSuccess
                  ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/30 scale-100'
                  : selectedFriendIds.length > 0 || sendToStory
                  ? 'bg-[#FFFC00] text-black shadow-xl shadow-[#FFFC00]/30 hover:scale-[1.01]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>
                    Sending Snap to {totalSelected} recipient{totalSelected > 1 ? 's' : ''}...
                  </span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCheck className="w-5 h-5 stroke-[2.5]" />
                  <span>Snap Sent Successfully!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-0.5" />
                  <span>
                    {selectedFriendIds.length === 0 && !sendToStory
                      ? 'Select Friends to Send'
                      : selectedFriendIds.length === 1 && !sendToStory
                      ? `Send to ${friends.find((f) => f.id === selectedFriendIds[0])?.name || 'Friend'}`
                      : `Send to ${totalSelected} Friend${totalSelected > 1 ? 's' : ''}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

