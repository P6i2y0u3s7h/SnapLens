import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Share2,
  Type,
  Smile,
  Paintbrush,
  Eraser,
  RotateCw,
  Undo2,
  Redo2,
  Check,
  X,
  Sparkles,
  Sliders,
  Crop,
  Scissors,
  Save,
  Trash2,
  Send,
  PlusCircle,
  RotateCcw,
  ZoomIn,
  Move,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';
import { FILTERS } from '../hooks/useCamera';
import { useMemories } from '../hooks/useMemories';
import { useStories } from '../hooks/useStories';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { uploadMediaToCloud } from '../services/firebaseService';
import SendToModal from '../components/SendToModal';
import toast from 'react-hot-toast';

// Color Palette for Brush & Text
const PALETTE = [
  '#FFFC00', // Snapchat Yellow
  '#FFFFFF', // White
  '#000000', // Black
  '#EF4444', // Red
  '#F97316', // Orange
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

// Emojis for Sticker Picker
const EMOJIS = [
  '🔥', '✨', '💛', '😎', '📸', '🎉', '⚡', '🥳',
  '❤️', '🚀', '💯', '🌈', '🤩', '🤙', '👑', '⭐',
  '👀', '🍿', '🌸', '🍕', '🍩', '🥑', '🍹', '🌴',
  '🦋', '💎', '🦄', '🔮', '💣', '🎯', '🛸', '👾',
  '🏆', '🥇', '🎈', '🧸'
];

// Snapchat Decorative Badge Stickers
const BADGE_STICKERS = [
  { id: 'b_streak', text: '🔥 STREAK', bg: '#EF4444', color: '#FFFFFF' },
  { id: 'b_vibes', text: '✨ VIBES', bg: '#FFFC00', color: '#000000' },
  { id: 'b_snap', text: '⚡ SNAP', bg: '#06B6D4', color: '#FFFFFF' },
  { id: 'b_royal', text: '👑 ROYAL', bg: '#F59E0B', color: '#000000' },
  { id: 'b_bestie', text: '💛 BESTIE', bg: '#FFFC00', color: '#000000' },
  { id: 'b_moment', text: '📸 MOMENT', bg: '#10B981', color: '#FFFFFF' },
  { id: 'b_party', text: '🎉 PARTY', bg: '#EC4899', color: '#FFFFFF' },
  { id: 'b_mood', text: '📍 MOOD', bg: '#8B5CF6', color: '#FFFFFF' },
  { id: 'b_star', text: '🌟 STAR', bg: '#FFD700', color: '#000000' },
  { id: 'b_blast', text: '🚀 BLAST', bg: '#3B82F6', color: '#FFFFFF' },
  { id: 'b_100', text: '💯 100', bg: '#DC2626', color: '#FFFFFF' },
  { id: 'b_foodie', text: '🍕 FOODIE', bg: '#F97316', color: '#FFFFFF' },
];

export default function EditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveMemory } = useMemories();
  const { addSnapToMyStory } = useStories();
  const { friends, sendSnapToFriend } = useChat();
  const { currentUser } = useAuth();

  const { dataUrl, videoUrl, blob, type = 'photo', filter: initialFilterName } = location.state || {};
  const isVideo = type === 'video' || !!videoUrl;

  // Canvas & History Refs
  const canvasRef = useRef(null);
  const videoPlayerRef = useRef(null);
  const originalImageRef = useRef(null);
  const isDrawingRef = useRef(false);
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);

  // Video playback states
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  // Active Tool Mode: null | 'draw' | 'erase' | 'text' | 'stickers' | 'crop' | 'adjust' | 'filters'
  const [activeTool, setActiveTool] = useState(null);

  // Drawing Brush & Eraser
  const [brushColor, setBrushColor] = useState('#FFFC00');
  const [brushSize, setBrushSize] = useState(8);
  const [eraserSize, setEraserSize] = useState(24);

  // Filter Selection
  const [selectedFilter, setSelectedFilter] = useState(
    FILTERS.find((f) => f.name === initialFilterName) || FILTERS[0]
  );

  // Adjustments
  const [adjustments, setAdjustments] = useState({
    brightness: 100, // 50 - 150%
    contrast: 100,   // 50 - 150%
    saturation: 100, // 0 - 200%
  });

  // Overlays (Text & Stickers)
  const [overlays, setOverlays] = useState([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);

  // Text Modal State
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#FFFC00');
  const [textSize, setTextSize] = useState(28);
  const [textRotation, setTextRotation] = useState(0);
  const [textStyle, setTextStyle] = useState('banner'); // 'clean' | 'banner' | 'neon'

  // Sticker Modal State
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [stickerTab, setStickerTab] = useState('emojis'); // 'emojis' | 'badges'

  // Crop State
  const [cropBox, setCropBox] = useState({ x: 5, y: 5, width: 90, height: 90 });
  const [cropAspect, setCropAspect] = useState('free'); // 'free' | '1:1' | '9:16' | '4:5' | '16:9'

  // Social & Export Modals
  const [showSendFriendsModal, setShowSendFriendsModal] = useState(false);
  const [sendMediaData, setSendMediaData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Initialize Base Canvas with Captured Photo
  useEffect(() => {
    if (isVideo || !canvasRef.current) return;

    const sourceImage =
      dataUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80';

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = sourceImage;

    img.onload = () => {
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 720;
      originalImageRef.current = img;

      ctx.drawImage(img, 0, 0);

      const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [initialSnapshot];
      historyIdxRef.current = 0;
    };
  }, [dataUrl, isVideo]);

  // Push Canvas snapshot to Undo Stack
  const pushToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(snapshot);
    historyIdxRef.current = historyRef.current.length - 1;
  }, []);

  // Undo action
  const handleUndo = () => {
    if (historyIdxRef.current <= 0) {
      toast('Nothing more to undo', { icon: 'ℹ️' });
      return;
    }
    historyIdxRef.current -= 1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    toast('Undo applied');
  };

  // Redo action
  const handleRedo = () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) {
      toast('Nothing to redo', { icon: 'ℹ️' });
      return;
    }
    historyIdxRef.current += 1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    toast('Redo applied');
  };

  // 2. Rotate Image 90° Clockwise
  const handleRotate90 = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prevW = canvas.width;
    const prevH = canvas.height;

    // Create temp offscreen canvas to hold current pixels
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = prevW;
    tempCanvas.height = prevH;
    tempCanvas.getContext('2d').drawImage(canvas, 0, 0);

    // Swap canvas dimensions
    canvas.width = prevH;
    canvas.height = prevW;
    const ctx = canvas.getContext('2d');

    ctx.translate(canvas.width, 0);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(tempCanvas, 0, 0);

    pushToHistory();
    toast.success('Rotated 90°', { icon: '🔄' });
  };

  // 3. Apply Crop
  const handleApplyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cropX = Math.round((cropBox.x / 100) * canvas.width);
    const cropY = Math.round((cropBox.y / 100) * canvas.height);
    const cropW = Math.round((cropBox.width / 100) * canvas.width);
    const cropH = Math.round((cropBox.height / 100) * canvas.height);

    if (cropW < 20 || cropH < 20) {
      toast.error('Crop area is too small');
      return;
    }

    const ctx = canvas.getContext('2d');
    const croppedData = ctx.getImageData(cropX, cropY, cropW, cropH);

    canvas.width = cropW;
    canvas.height = cropH;
    ctx.putImageData(croppedData, 0, 0);

    pushToHistory();
    setActiveTool(null);
    setCropBox({ x: 5, y: 5, width: 90, height: 90 });
    toast.success('Crop applied!', { icon: '✂️' });
  };

  // 4. Drawing Handlers
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    if (activeTool !== 'draw' && activeTool !== 'erase') return;
    isDrawingRef.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawMove = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    if (activeTool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    pushToHistory();
  };

  // 5. Add / Edit Text
  const handleConfirmText = () => {
    if (!textInput.trim()) return;

    if (selectedOverlayId) {
      // Update existing text overlay
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === selectedOverlayId
            ? {
                ...o,
                content: textInput,
                color: textColor,
                size: textSize,
                rotation: textRotation,
                style: textStyle,
              }
            : o
        )
      );
      toast.success('Text updated');
    } else {
      // Add new text overlay
      const newOverlay = {
        id: Date.now(),
        type: 'text',
        content: textInput,
        color: textColor,
        size: textSize,
        rotation: textRotation,
        style: textStyle,
        x: 50,
        y: 40,
      };
      setOverlays((prev) => [...prev, newOverlay]);
      setSelectedOverlayId(newOverlay.id);
      toast.success('Text added! Drag to move.', { icon: '🔤' });
    }

    setTextInput('');
    setShowTextModal(false);
  };

  // 6. Add Emoji Sticker
  const handleAddEmoji = (emoji) => {
    const newSticker = {
      id: Date.now(),
      type: 'emoji',
      content: emoji,
      size: 48,
      rotation: 0,
      x: 50,
      y: 50,
    };
    setOverlays((prev) => [...prev, newSticker]);
    setSelectedOverlayId(newSticker.id);
    setShowStickerModal(false);
    toast.success('Sticker added! Drag to move.', { icon: '✨' });
  };

  // 7. Add Snapchat Badge Sticker
  const handleAddBadge = (badge) => {
    const newBadge = {
      id: Date.now(),
      type: 'badge',
      content: badge.text,
      badgeBg: badge.bg,
      badgeText: badge.color,
      size: 40,
      rotation: 0,
      x: 50,
      y: 50,
    };
    setOverlays((prev) => [...prev, newBadge]);
    setSelectedOverlayId(newBadge.id);
    setShowStickerModal(false);
    toast.success('Badge added! Drag to move.', { icon: '🏷️' });
  };

  // 8. Dragging Overlays across Canvas
  const handleOverlayDrag = (id, e) => {
    e.preventDefault();
    setSelectedOverlayId(id);

    const startClientX = e.touches ? e.touches[0].clientX : e.clientX;
    const startClientY = e.touches ? e.touches[0].clientY : e.clientY;

    const overlay = overlays.find((o) => o.id === id);
    if (!overlay) return;

    const initialX = overlay.x;
    const initialY = overlay.y;

    const onMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const container = document.getElementById('editor-canvas-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const deltaXPercent = ((curX - startClientX) / rect.width) * 100;
      const deltaYPercent = ((curY - startClientY) / rect.height) * 100;

      setOverlays((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                x: Math.min(Math.max(4, initialX + deltaXPercent), 96),
                y: Math.min(Math.max(4, initialY + deltaYPercent), 96),
              }
            : o
        )
      );
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  // 9. Generate Final Composite High-Quality Export
  const generateCompositeDataUrl = () => {
    if (isVideo) return videoUrl;
    const canvas = canvasRef.current;
    if (!canvas) return dataUrl;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');

    // 1. Base image with adjustments and filter
    const filterParts = [];
    if (selectedFilter.css && selectedFilter.css !== 'none') {
      filterParts.push(selectedFilter.css);
    }
    if (adjustments.brightness !== 100) {
      filterParts.push(`brightness(${adjustments.brightness / 100})`);
    }
    if (adjustments.contrast !== 100) {
      filterParts.push(`contrast(${adjustments.contrast / 100})`);
    }
    if (adjustments.saturation !== 100) {
      filterParts.push(`saturate(${adjustments.saturation / 100})`);
    }
    if (filterParts.length > 0) {
      ctx.filter = filterParts.join(' ');
    }

    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    // 2. Composite all Text, Emojis, and Badges with position, scale, and rotation
    const scaleFactor = Math.max(1, canvas.width / 500);

    overlays.forEach((item) => {
      const posX = (item.x / 100) * canvas.width;
      const posY = (item.y / 100) * canvas.height;
      const angle = ((item.rotation || 0) * Math.PI) / 180;

      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate(angle);

      if (item.type === 'text') {
        const fontSize = Math.round((item.size || 28) * scaleFactor);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (item.style === 'banner') {
          const metrics = ctx.measureText(item.content);
          const padX = fontSize * 0.45;
          const padY = fontSize * 0.28;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.beginPath();
          const bw = metrics.width + padX * 2;
          const bh = fontSize + padY * 2;
          ctx.rect(-bw / 2, -bh / 2, bw, bh);
          ctx.fill();
        } else if (item.style === 'neon') {
          ctx.shadowColor = item.color || '#06B6D4';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = item.color || '#06B6D4';
          ctx.lineWidth = 3;
          ctx.strokeText(item.content, 0, 0);
        } else {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 10;
        }

        ctx.fillStyle = item.color || '#FFFC00';
        ctx.fillText(item.content, 0, 0);
      } else if (item.type === 'emoji') {
        const emojiSize = Math.round((item.size || 48) * scaleFactor);
        ctx.font = `${emojiSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 8;
        ctx.fillText(item.content, 0, 0);
      } else if (item.type === 'badge') {
        const badgeSize = Math.round((item.size || 40) * scaleFactor);
        ctx.font = `black ${Math.round(badgeSize * 0.55)}px Inter, sans-serif`;
        const metrics = ctx.measureText(item.content);
        const w = metrics.width + badgeSize * 0.8;
        const h = badgeSize * 0.95;

        ctx.fillStyle = item.badgeBg || '#FFFC00';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.rect(-w / 2, -h / 2, w, h);
        ctx.fill();

        ctx.fillStyle = item.badgeText || '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(item.content, 0, 0);
      }

      ctx.restore();
    });

    return exportCanvas.toDataURL('image/jpeg', 0.96);
  };

  // 10. Direct Download
  const handleDownload = () => {
    if (isVideo) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `snaplens_video_${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Video downloaded!', { icon: '🎥' });
      return;
    }
    const finalUrl = generateCompositeDataUrl();
    const link = document.createElement('a');
    link.href = finalUrl;
    link.download = `snaplens_edit_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Snap downloaded successfully!', { icon: '💾' });
  };

  // 11. Save to Memories & Cloud Storage
  const handleSaveToMemories = async () => {
    setIsExporting(true);
    const finalUrl = isVideo ? videoUrl : generateCompositeDataUrl();
    const caption =
      overlays.find((o) => o.type === 'text')?.content ||
      (isVideo ? 'Edited Video Snap' : 'Edited Snap');

    let effectiveBlob = blob || null;
    if (isVideo && !effectiveBlob && videoUrl) {
      try {
        const res = await fetch(videoUrl);
        effectiveBlob = await res.blob();
      } catch (err) {
        console.warn('Could not fetch blob from videoUrl:', err);
      }
    }

    try {
      const uploadRes = await uploadMediaToCloud({
        dataUrl: isVideo ? null : finalUrl,
        fileBlob: isVideo ? effectiveBlob : null,
        type: isVideo ? 'video' : 'photo',
        filter: selectedFilter.name,
        caption,
        visibility: 'private',
        userId: currentUser?.uid,
      });

      const effectiveUrl = uploadRes?.mediaUrl || finalUrl;

      await saveMemory({
        type: isVideo ? 'video' : 'photo',
        dataUrl: isVideo ? null : finalUrl,
        url: effectiveUrl,
        blob: effectiveBlob,
        filter: selectedFilter.name,
        title: caption,
        cloudId: uploadRes?.cloudId || null,
        storagePath: uploadRes?.storagePath || null,
        isLocal: uploadRes?.isLocal ?? true,
      });
    } catch (e) {
      console.debug('Cloud upload fallback:', e);
      await saveMemory({
        type: isVideo ? 'video' : 'photo',
        dataUrl: isVideo ? null : finalUrl,
        url: finalUrl,
        blob: effectiveBlob,
        filter: selectedFilter.name,
        title: caption,
      });
    }

    setIsExporting(false);
    toast.success(isVideo ? 'Video saved to Memories!' : 'Saved to Memories!', { icon: '🎉' });
  };

  // 12. Add to 24h My Story
  const handleAddToStory = () => {
    const finalUrl = isVideo ? videoUrl : generateCompositeDataUrl();
    const caption = overlays.find((o) => o.type === 'text')?.content || '';

    addSnapToMyStory({
      type: isVideo ? 'video' : 'photo',
      url: finalUrl,
      caption,
      filter: selectedFilter.name,
      duration: isVideo ? 10 : 5,
    });

    toast.success(isVideo ? 'Video added to My Story!' : 'Photo added to My Story!', { icon: '✨' });
    navigate('/stories');
  };

  // 13. Open Multi-Friend Send To Modal
  const handleOpenSendModal = () => {
    const finalUrl = isVideo ? videoUrl : generateCompositeDataUrl();
    const caption = overlays.find((o) => o.type === 'text')?.content || '';
    setSendMediaData({
      url: finalUrl,
      type: isVideo ? 'video' : 'photo',
      caption,
    });
    setShowSendFriendsModal(true);
  };

  // Selected Overlay item helper
  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);

  return (
    <div className="fixed inset-0 h-dvh w-full bg-[#0A0A0F] text-white flex flex-col justify-between overflow-hidden select-none no-pull-refresh">
      {/* ── TOP ACTION HEADER BAR ── */}
      <header className="z-30 h-14 sm:h-16 px-2 sm:px-4 flex items-center justify-between bg-[#0A0A0F]/90 backdrop-blur-md border-b border-white/10 gap-1 sm:gap-2 min-w-0 w-full overflow-x-auto no-scrollbar touch-scroll-x pt-safe">
        {/* Left: Retake Button */}
        <div className="flex items-center flex-shrink-0">
          <button
            onClick={() => navigate('/camera')}
            className="glass-pill h-9 sm:h-10 px-2 sm:px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-white/15 text-white active:scale-95 transition-all flex-shrink-0"
            title="Retake Photo"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FFFC00] flex-shrink-0" />
            <span className="hidden min-[360px]:inline">Retake</span>
          </button>
        </div>

        {/* Center: Undo / Redo / Rotate 90° */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <button
            onClick={handleUndo}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl glass-pill flex items-center justify-center text-white/75 hover:text-white active:scale-95 transition-all"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={handleRedo}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl glass-pill flex items-center justify-center text-white/75 hover:text-white active:scale-95 transition-all"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={handleRotate90}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl glass-pill flex items-center justify-center text-white/75 hover:text-white active:scale-95 transition-all"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Right: Send Snap action */}
        <div className="flex items-center flex-shrink-0">
          <button
            onClick={handleOpenSendModal}
            className="btn-snap h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-bold text-black flex items-center gap-1.5 shadow-md shadow-[#FFFC00]/20 active:scale-95 transition-all"
            title="Send Snap to Friends"
          >
            <Send className="w-3.5 h-3.5 text-black flex-shrink-0" />
            <span>Send</span>
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE / CANVAS VIEWPORT ── */}
      <main className="relative flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-[#07070B] select-none">
        <div
          id="editor-canvas-container"
          className="relative max-w-full max-h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center bg-black/40"
        >
          {/* Video Player or Photo Drawing Canvas */}
          {isVideo ? (
            <div className="relative max-h-[calc(100dvh-185px)] sm:max-h-[74vh] flex items-center justify-center">
              <video
                ref={videoPlayerRef}
                src={videoUrl}
                playsInline
                loop
                autoPlay
                muted={isVideoMuted}
                className="max-h-[calc(100dvh-185px)] max-w-[calc(100vw-68px)] sm:max-w-full sm:max-h-[74vh] w-auto h-auto rounded-xl sm:rounded-2xl block object-contain shadow-2xl cursor-pointer"
                style={{
                  filter: selectedFilter.css !== 'none' ? selectedFilter.css : undefined,
                }}
                onClick={() => {
                  const v = videoPlayerRef.current;
                  if (!v) return;
                  if (v.paused) {
                    v.play();
                    setIsVideoPlaying(true);
                  } else {
                    v.pause();
                    setIsVideoPlaying(false);
                  }
                }}
              />

              {/* Play / Pause floating indicator */}
              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-[#FFFC00] shadow-2xl">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Audio Mute / Unmute Toggle */}
              <button
                onClick={() => {
                  const next = !isVideoMuted;
                  setIsVideoMuted(next);
                  if (videoPlayerRef.current) videoPlayerRef.current.muted = next;
                }}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full glass-pill flex items-center justify-center ${
                  isVideoMuted ? 'text-red-400' : 'text-[#FFFC00]'
                }`}
                title={isVideoMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="max-h-[calc(100dvh-185px)] max-w-[calc(100vw-68px)] sm:max-w-full sm:max-h-[74vh] w-auto h-auto rounded-xl sm:rounded-2xl block object-contain shadow-2xl"
              style={{
                filter: `
                  ${selectedFilter.css !== 'none' ? selectedFilter.css : ''}
                  brightness(${adjustments.brightness}%)
                  contrast(${adjustments.contrast}%)
                  saturate(${adjustments.saturation}%)
                `,
                cursor:
                  activeTool === 'draw'
                    ? 'crosshair'
                    : activeTool === 'erase'
                    ? 'cell'
                    : 'default',
              }}
              onMouseDown={startDrawing}
              onMouseMove={drawMove}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={drawMove}
              onTouchEnd={endDrawing}
            />
          )}

          {/* Interactive Crop Box Overlay */}
          {activeTool === 'crop' && (
            <div
              className="absolute border-2 border-[#FFFC00] shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none"
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
            >
              {/* Rule of thirds grid inside crop box */}
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-white/30" />
                <div className="border-r border-white/30" />
                <div />
              </div>
            </div>
          )}

          {/* Overlaid Captions & Stickers */}
          {overlays.map((item) => {
            const isSelected = selectedOverlayId === item.id;
            return (
              <div
                key={item.id}
                onMouseDown={(e) => handleOverlayDrag(item.id, e)}
                onTouchStart={(e) => handleOverlayDrag(item.id, e)}
                style={{
                  position: 'absolute',
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
                  cursor: 'grab',
                  touchAction: 'none',
                }}
                className={`group select-none transition-shadow ${
                  isSelected ? 'ring-2 ring-[#FFFC00] ring-offset-2 ring-offset-black/50 rounded-xl' : ''
                }`}
              >
                {item.type === 'text' ? (
                  <div
                    className={`px-3 py-1.5 rounded-xl font-black tracking-tight ${
                      item.style === 'banner'
                        ? 'bg-black/70 backdrop-blur-sm border border-white/20'
                        : item.style === 'neon'
                        ? 'drop-shadow-[0_0_12px_rgba(6,182,212,0.9)]'
                        : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'
                    }`}
                    style={{
                      color: item.color || '#FFFC00',
                      fontSize: `${item.size}px`,
                    }}
                  >
                    {item.content}
                  </div>
                ) : item.type === 'badge' ? (
                  <div
                    className="px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider shadow-xl"
                    style={{
                      backgroundColor: item.badgeBg || '#FFFC00',
                      color: item.badgeText || '#000000',
                      fontSize: `${item.size * 0.4}px`,
                    }}
                  >
                    {item.content}
                  </div>
                ) : (
                  <div style={{ fontSize: `${item.size}px` }}>{item.content}</div>
                )}

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOverlays((prev) => prev.filter((o) => o.id !== item.id));
                    if (selectedOverlayId === item.id) setSelectedOverlayId(null);
                  }}
                  className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  title="Remove item"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* ── RIGHT FLOATING SNAPCHAT VERTICAL TOOLBAR ── */}
        <div className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 sm:gap-2 bg-black/75 backdrop-blur-xl border border-white/15 p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl shadow-2xl max-h-[calc(100%-16px)] overflow-y-auto no-scrollbar">
          {/* Draw Brush Tool */}
          <button
            onClick={() => setActiveTool((t) => (t === 'draw' ? null : 'draw'))}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
              activeTool === 'draw'
                ? 'bg-[#FFFC00] text-black shadow-lg shadow-[#FFFC00]/30 scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95'
            }`}
            title="Brush Tool"
          >
            <Paintbrush className="w-4 h-4" />
          </button>

          {/* Eraser Tool */}
          <button
            onClick={() => setActiveTool((t) => (t === 'erase' ? null : 'erase'))}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
              activeTool === 'erase'
                ? 'bg-[#FFFC00] text-black shadow-lg shadow-[#FFFC00]/30 scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95'
            }`}
            title="Eraser Tool"
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Text Tool */}
          <button
            onClick={() => {
              setActiveTool('text');
              setSelectedOverlayId(null);
              setTextInput('');
              setShowTextModal(true);
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Add Text"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Stickers & Emojis Tool */}
          <button
            onClick={() => setShowStickerModal(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Stickers & Emojis"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Crop Tool */}
          <button
            onClick={() => setActiveTool((t) => (t === 'crop' ? null : 'crop'))}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
              activeTool === 'crop'
                ? 'bg-[#FFFC00] text-black shadow-lg shadow-[#FFFC00]/30 scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95'
            }`}
            title="Crop Image"
          >
            <Crop className="w-4 h-4" />
          </button>

          {/* Adjustments Tool (Brightness/Contrast/Saturation) */}
          <button
            onClick={() => setActiveTool((t) => (t === 'adjust' ? null : 'adjust'))}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
              activeTool === 'adjust'
                ? 'bg-[#FFFC00] text-black shadow-lg shadow-[#FFFC00]/30 scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95'
            }`}
            title="Tune Lighting & Color"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Filter Toggle */}
          <button
            onClick={() => setActiveTool((t) => (t === 'filters' ? null : 'filters'))}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
              activeTool === 'filters'
                ? 'bg-[#FFFC00] text-black shadow-lg shadow-[#FFFC00]/30 scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95'
            }`}
            title="Color Filters"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* ── TOOL FLYOUT PANELS ── */}

        {/* 1. Brush & Eraser Controls Drawer */}
        <AnimatePresence>
          {(activeTool === 'draw' || activeTool === 'erase') && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-12 sm:right-18 top-1/2 -translate-y-1/2 z-30 w-[calc(100vw-64px)] max-w-[240px] sm:w-56 glass-panel p-3.5 sm:p-4 rounded-3xl border border-white/15 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {activeTool === 'draw' ? (
                    <>
                      <Paintbrush className="w-3.5 h-3.5 text-[#FFFC00]" />
                      <span>Brush Settings</span>
                    </>
                  ) : (
                    <>
                      <Eraser className="w-3.5 h-3.5 text-[#FFFC00]" />
                      <span>Eraser Size</span>
                    </>
                  )}
                </span>
                <button onClick={() => setActiveTool(null)}>
                  <X className="w-3 h-3 text-white/60 hover:text-white" />
                </button>
              </div>

              {/* Size Slider */}
              <div className="mb-4">
                <div className="flex justify-between text-[11px] text-white/70 mb-1">
                  <span>Size</span>
                  <span className="font-mono text-[#FFFC00]">
                    {activeTool === 'draw' ? `${brushSize}px` : `${eraserSize}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max={activeTool === 'draw' ? 36 : 64}
                  value={activeTool === 'draw' ? brushSize : eraserSize}
                  onChange={(e) =>
                    activeTool === 'draw'
                      ? setBrushSize(parseInt(e.target.value))
                      : setEraserSize(parseInt(e.target.value))
                  }
                  className="w-full h-1.5 rounded-lg bg-white/10 accent-[#FFFC00] cursor-pointer"
                />
              </div>

              {/* Color Palette (Brush mode only) */}
              {activeTool === 'draw' && (
                <div>
                  <span className="text-[11px] text-white/70 block mb-2 font-medium">Color:</span>
                  <div className="grid grid-cols-5 gap-2">
                    {PALETTE.map((col) => (
                      <button
                        key={col}
                        onClick={() => setBrushColor(col)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          brushColor === col ? 'scale-125 border-white shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Crop Controls Drawer */}
        <AnimatePresence>
          {activeTool === 'crop' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-20px)] max-w-md glass-panel p-3 sm:p-4 rounded-3xl border border-white/15 shadow-2xl flex flex-wrap items-center justify-center gap-2 sm:gap-3"
            >
              <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                {['free', '1:1', '9:16', '4:5', '16:9'].map((aspect) => (
                  <button
                    key={aspect}
                    onClick={() => {
                      setCropAspect(aspect);
                      if (aspect === '1:1') setCropBox({ x: 15, y: 15, width: 70, height: 70 });
                      else if (aspect === '9:16') setCropBox({ x: 25, y: 5, width: 50, height: 90 });
                      else if (aspect === '4:5') setCropBox({ x: 20, y: 10, width: 60, height: 80 });
                      else if (aspect === '16:9') setCropBox({ x: 5, y: 25, width: 90, height: 50 });
                      else setCropBox({ x: 5, y: 5, width: 90, height: 90 });
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold uppercase transition-colors ${
                      cropAspect === aspect
                        ? 'bg-[#FFFC00] text-black shadow-md'
                        : 'bg-white/5 text-white/70 hover:text-white'
                    }`}
                  >
                    {aspect}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTool(null)}
                  className="glass-pill px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCrop}
                  className="btn-snap px-4 py-1.5 text-xs font-bold text-black flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span>Apply Crop</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Adjustments Controls Drawer (Brightness, Contrast, Saturation) */}
        <AnimatePresence>
          {activeTool === 'adjust' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-12 sm:right-18 top-1/2 -translate-y-1/2 z-30 w-[calc(100vw-64px)] max-w-[250px] sm:w-64 glass-panel p-4 sm:p-5 rounded-3xl border border-white/15 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#FFFC00]" />
                  <span>Image Adjustments</span>
                </span>
                <button onClick={() => setActiveTool(null)}>
                  <X className="w-3 h-3 text-white/60 hover:text-white" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Brightness */}
                <div>
                  <div className="flex justify-between mb-1 text-white/70 font-medium">
                    <span>Brightness</span>
                    <span className="text-[#FFFC00] font-mono">{adjustments.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={adjustments.brightness}
                    onChange={(e) =>
                      setAdjustments((prev) => ({ ...prev, brightness: parseInt(e.target.value) }))
                    }
                    className="w-full h-1.5 rounded-lg bg-white/10 accent-[#FFFC00] cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex justify-between mb-1 text-white/70 font-medium">
                    <span>Contrast</span>
                    <span className="text-[#FFFC00] font-mono">{adjustments.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={adjustments.contrast}
                    onChange={(e) =>
                      setAdjustments((prev) => ({ ...prev, contrast: parseInt(e.target.value) }))
                    }
                    className="w-full h-1.5 rounded-lg bg-white/10 accent-[#FFFC00] cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div>
                  <div className="flex justify-between mb-1 text-white/70 font-medium">
                    <span>Saturation</span>
                    <span className="text-[#FFFC00] font-mono">{adjustments.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={adjustments.saturation}
                    onChange={(e) =>
                      setAdjustments((prev) => ({ ...prev, saturation: parseInt(e.target.value) }))
                    }
                    className="w-full h-1.5 rounded-lg bg-white/10 accent-[#FFFC00] cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => setAdjustments({ brightness: 100, contrast: 100, saturation: 100 })}
                  className="w-full mt-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[11px] font-semibold transition-colors"
                >
                  Reset Adjustments
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Selected Overlay Controls (Reposition, Resize, Rotate, Remove) */}
        {selectedOverlay && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-2xl border border-white/15 flex items-center gap-3 shadow-xl">
            <span className="text-[11px] font-bold text-[#FFFC00]">
              {selectedOverlay.type === 'text' ? 'Text Selected' : 'Sticker Selected'}:
            </span>

            {/* Resize Slider */}
            <div className="flex items-center gap-1.5">
              <ZoomIn className="w-3 h-3 text-white/60" />
              <input
                type="range"
                min="16"
                max="100"
                value={selectedOverlay.size || 28}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  setOverlays((prev) =>
                    prev.map((o) => (o.id === selectedOverlay.id ? { ...o, size: newSize } : o))
                  );
                }}
                className="w-16 sm:w-24 h-1 bg-white/20 accent-[#FFFC00] cursor-pointer"
              />
            </div>

            {/* Rotate Slider */}
            <div className="flex items-center gap-1.5">
              <RotateCw className="w-3 h-3 text-white/60" />
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedOverlay.rotation || 0}
                onChange={(e) => {
                  const newRot = parseInt(e.target.value);
                  setOverlays((prev) =>
                    prev.map((o) => (o.id === selectedOverlay.id ? { ...o, rotation: newRot } : o))
                  );
                }}
                className="w-16 sm:w-20 h-1 bg-white/20 accent-[#FFFC00] cursor-pointer"
              />
            </div>

            {/* Delete button */}
            <button
              onClick={() => {
                setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlay.id));
                setSelectedOverlayId(null);
              }}
              className="w-6 h-6 rounded-lg bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
              title="Delete item"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── TEXT INPUT & STYLING MODAL ── */}
        <AnimatePresence>
          {showTextModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <div className="glass-panel rounded-3xl p-6 max-w-sm sm:max-w-md w-full border border-white/20 shadow-2xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#FFFC00]" />
                  <span>Customize Text Caption</span>
                </h3>

                <input
                  type="text"
                  autoFocus
                  placeholder="Type caption..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmText()}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-[#FFFC00] text-sm mb-4"
                />

                {/* Style selector: Clean / Banner / Neon */}
                <div className="mb-4">
                  <span className="text-[11px] text-white/60 block mb-1.5 font-medium">Text Style:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'banner', label: 'Dark Banner' },
                      { id: 'clean', label: 'Clean Shadow' },
                      { id: 'neon', label: 'Neon Glow' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setTextStyle(st.id)}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          textStyle === st.id
                            ? 'bg-[#FFFC00] text-black shadow-md'
                            : 'bg-white/5 text-white/70 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size & Rotation Sliders */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-white/60 mb-1">
                      <span>Font Size</span>
                      <span className="font-mono text-[#FFFC00]">{textSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="64"
                      value={textSize}
                      onChange={(e) => setTextSize(parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-lg bg-white/10 accent-[#FFFC00] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-white/60 mb-1">
                      <span>Rotation</span>
                      <span className="font-mono text-[#FFFC00]">{textRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={textRotation}
                      onChange={(e) => setTextRotation(parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-lg bg-white/10 accent-[#FFFC00] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Color swatches */}
                <div className="mb-6">
                  <span className="text-[11px] text-white/60 block mb-2 font-medium">Text Color:</span>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        onClick={() => setTextColor(c)}
                        className={`w-7 h-7 rounded-full flex-shrink-0 border-2 transition-transform ${
                          textColor === c ? 'scale-125 border-white shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowTextModal(false)}
                    className="flex-1 glass-pill py-2.5 text-xs font-semibold text-white/70 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmText}
                    className="flex-1 btn-snap py-2.5 text-xs font-bold text-black"
                  >
                    Confirm Text
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STICKER & EMOJI PICKER MODAL ── */}
        <AnimatePresence>
          {showStickerModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setShowStickerModal(false)}
            >
              <div
                className="glass-panel rounded-3xl p-5 max-w-sm sm:max-w-md w-full border border-white/20 shadow-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStickerTab('emojis')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        stickerTab === 'emojis'
                          ? 'bg-[#FFFC00] text-black shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Emojis
                    </button>
                    <button
                      onClick={() => setStickerTab('badges')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        stickerTab === 'badges'
                          ? 'bg-[#FFFC00] text-black shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Snap Badges
                    </button>
                  </div>
                  <button onClick={() => setShowStickerModal(false)}>
                    <X className="w-4 h-4 text-white/60 hover:text-white" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                  {stickerTab === 'emojis' ? (
                    <div className="grid grid-cols-6 gap-3 text-3xl py-2">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddEmoji(emoji)}
                          className="w-11 h-11 rounded-2xl glass-pill flex items-center justify-center hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 py-1">
                      {BADGE_STICKERS.map((badge) => (
                        <button
                          key={badge.id}
                          onClick={() => handleAddBadge(badge)}
                          className="p-3 rounded-2xl border border-white/10 hover:scale-105 transition-transform text-center font-black text-xs uppercase shadow-md"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {badge.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MULTI-FRIEND SEND TO MODAL ── */}
        <SendToModal
          isOpen={showSendFriendsModal}
          onClose={() => setShowSendFriendsModal(false)}
          mediaUrl={sendMediaData?.url || (isVideo ? videoUrl : null)}
          mediaType={sendMediaData?.type || (isVideo ? 'video' : 'photo')}
          caption={sendMediaData?.caption || overlays.find((o) => o.type === 'text')?.content || ''}
          onSent={({ primaryFriendId }) => {
            if (primaryFriendId) {
              navigate('/chat', { state: { activeFriendId: primaryFriendId } });
            } else {
              navigate('/chat');
            }
          }}
        />
      </main>

      {/* ── BOTTOM FILTER CAROUSEL & ACTIONS BAR ── */}
      <footer className="z-30 bg-[#0A0A0F]/90 backdrop-blur-md border-t border-white/8 p-3 sm:p-4 pb-safe">
        {/* 10 Real-Time Filter Shaders Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-scroll-x max-w-xl mx-auto px-1 pb-2 overscroll-x-contain">
          {FILTERS.map((f) => {
            const isSelected = selectedFilter.id === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-[#FFFC00] text-black font-bold shadow-md shadow-[#FFFC00]/30 scale-105 ring-1 ring-[#FFFC00]'
                    : 'bg-white/8 text-white/70 hover:text-white hover:bg-white/12 border border-white/10'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: f.color || '#fff' }}
                />
                <span className="whitespace-nowrap">{f.name}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Save to Memories & Export & Download Actions Bar */}
        <div className="flex items-center justify-between max-w-md mx-auto pt-2 gap-2 sm:gap-3 w-full">
          <button
            onClick={handleSaveToMemories}
            disabled={isExporting}
            className="flex-1 h-11 sm:h-12 rounded-2xl glass-pill flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm font-bold text-white hover:bg-white/15 active:scale-95 transition-all min-w-0"
            title="Save to Memories"
          >
            <Save className="w-4 h-4 text-[#FFFC00] flex-shrink-0" />
            <span className="truncate whitespace-nowrap">Save to Memories</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 h-11 sm:h-12 rounded-2xl btn-snap flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm font-bold text-black shadow-lg shadow-[#FFFC00]/25 active:scale-95 transition-all min-w-0"
            title="Export & Download"
          >
            <Download className="w-4 h-4 text-black flex-shrink-0" />
            <span className="truncate whitespace-nowrap">Export & Download</span>
          </button>
        </div>
      </footer>
    </div>
  );
}