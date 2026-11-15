import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, Sparkles, Volume2, VolumeX, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

function formatStoryRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const timeMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const diffSec = Math.floor((Date.now() - timeMs) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return 'Today';
}

export default function StoryViewerModal({ storyGroup, onClose, onStoryComplete, onStoryViewed }) {
  if (!storyGroup || !storyGroup.items || storyGroup.items.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);

  const currentItem = storyGroup.items[currentIndex] || storyGroup.items[0];
  const DURATION_MS =
    currentItem?.duration && currentItem.duration > 0
      ? currentItem.duration * 1000
      : currentItem?.type === 'video'
        ? 10000
        : 5000;

  // Mark story as viewed as soon as it displays
  useEffect(() => {
    if (currentItem?.id && onStoryViewed) {
      onStoryViewed(currentItem.id, storyGroup.id || storyGroup.user?.id);
    }
  }, [currentIndex, currentItem?.id, onStoryViewed, storyGroup.id, storyGroup.user?.id]);

  // Video playback management on pause / play
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, currentIndex]);

  // Auto-progress timer
  useEffect(() => {
    if (isPaused) return;

    const intervalTime = 50; // update every 50ms
    const step = (intervalTime / DURATION_MS) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          // Advance to next snap or next story
          if (currentIndex < storyGroup.items.length - 1) {
            setCurrentIndex((i) => i + 1);
            return 0;
          } else {
            clearInterval(interval);
            if (onStoryComplete) onStoryComplete();
            else onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, storyGroup, DURATION_MS, onClose, onStoryComplete]);

  // Reset progress when index changes
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const handleTapPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  };

  const handleTapNext = () => {
    if (currentIndex < storyGroup.items.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      if (onStoryComplete) onStoryComplete();
      else onClose();
    }
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    toast.success(`Reply sent to ${storyGroup.user?.name || 'Story'}!`, {
      icon: '💬',
      style: { background: '#141420', color: '#fff', border: '1px solid rgba(255,252,0,0.3)' },
    });
    setReplyText('');
    setIsPaused(false);
  };

  const handleReaction = (emoji) => {
    toast(`Reacted with ${emoji}`, {
      icon: emoji,
      style: { background: '#141420', color: '#fff', borderRadius: '9999px' },
    });
  };

  const timeLabel = currentItem?.createdAtMs
    ? formatStoryRelativeTime(currentItem.createdAtMs)
    : currentItem?.time || 'Today';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
    >
      {/* Phone container */}
      <div className="relative w-full h-full max-w-md max-h-[100dvh] bg-[#0E0E17] sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border sm:border-white/10">
        {/* Top Segmented Progress Bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {storyGroup.items.map((item, idx) => {
            let fillPercent = 0;
            if (idx < currentIndex) fillPercent = 100;
            else if (idx === currentIndex) fillPercent = progress;

            return (
              <div key={item.id || idx} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header: User info & Close */}
        <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <img
              src={storyGroup.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${storyGroup.id || 'snap'}`}
              alt={storyGroup.user?.name || 'User'}
              className="w-9 h-9 rounded-full object-cover border-2 border-[#FFFC00]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm drop-shadow-md">
                  {storyGroup.user?.name || 'My Story'}
                </h4>
                <span className="text-[11px] text-white/70 font-medium">
                  {timeLabel}
                </span>
              </div>
              {storyGroup.user?.handle && (
                <span className="text-[10px] text-white/50 font-mono block -mt-0.5">
                  @{storyGroup.user.handle.replace(/^@/, '')}
                </span>
              )}
              {currentItem?.filter && currentItem.filter !== 'Original' && (
                <span className="text-[10px] text-[#FFFC00] flex items-center gap-1 drop-shadow-md">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{currentItem.filter}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentItem?.type === 'video' && (
              <button
                onClick={() => setIsMuted((p) => !p)}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Media Viewport */}
        <div
          className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {currentItem?.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentItem.url}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-cover"
              onError={() => {
                toast.error('Unable to play video snap');
              }}
            />
          ) : (
            <img
              src={currentItem?.url}
              alt="Story snap"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80';
              }}
            />
          )}

          {/* Left / Right Tap zones */}
          <div
            onClick={handleTapPrevious}
            className="absolute left-0 top-16 bottom-24 w-1/3 z-20 cursor-pointer"
            aria-label="Previous Snap"
          />
          <div
            onClick={handleTapNext}
            className="absolute right-0 top-16 bottom-24 w-1/3 z-20 cursor-pointer"
            aria-label="Next Snap"
          />

          {/* Story Caption overlay */}
          {currentItem?.caption && (
            <div className="absolute bottom-24 left-4 right-4 z-20 text-center pointer-events-none">
              <span className="inline-block px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-sm sm:text-base font-bold text-white drop-shadow-lg">
                {currentItem.caption}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Bar: Reply & Quick Reactions */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {/* Reaction chips */}
          <div className="flex items-center justify-center gap-3 mb-3">
            {['🔥', '💛', '😂', '😍', '👏', '💯'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-lg flex items-center justify-center hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply input form */}
          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Send reply to ${storyGroup.user?.name ? storyGroup.user.name.split(' ')[0] : 'story'}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className="flex-1 px-4 py-2.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs text-white placeholder-white/50 focus:outline-none focus:border-[#FFFC00]"
            />
            <button
              type="submit"
              className="w-10 h-10 rounded-full snap-gradient flex items-center justify-center text-black flex-shrink-0 shadow-lg shadow-[#FFFC00]/20 hover:scale-105 active:scale-95 transition-transform"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
