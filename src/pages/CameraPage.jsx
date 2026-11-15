import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  Volume2,
  VolumeX,
  Settings,
  RefreshCw,
  Image as ImageIcon,
  Sliders,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Grid,
  AlertCircle,
  ShieldAlert,
  VideoOff,
  CameraOff,
  Lock,
  Video,
  HelpCircle,
  RotateCcw,
  Download,
  Edit3,
  Smile,
  Layers,
  Crown,
  Eye,
  Heart,
  Play,
  Pause,
  Type,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useCamera, FILTERS } from '../hooks/useCamera';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { useMemories } from '../hooks/useMemories';
import { useChat } from '../hooks/useChat';
import { useStories } from '../hooks/useStories';
import { useAuth } from '../contexts/AuthContext';
import { uploadMediaToCloud } from '../services/firebaseService';
import {
  AR_FILTERS,
  FILTER_CATEGORIES,
  renderArFilterOnCanvas,
} from '../utils/arFilterEngine';
import {
  playCameraOpenSound,
  playPhotoModeSound,
  playVideoModeSound,
  playShutterSound,
  playRecordStartSound,
  playRecordStopSound,
  playCameraSwitchSound,
  playFilterPopSound,
  isSoundMuted,
  toggleSoundMuted,
  initAudio,
} from '../utils/audioUtils';
import toast from 'react-hot-toast';

// AR Face Lenses and Procedural Renderers are imported from ../utils/arFilterEngine

export default function CameraPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    videoRef,
    streamRef,
    isLoading,
    hasPermission,
    errorMessage,
    errorDetails,
    availableDevices,
    facingMode,
    mode,
    setMode,
    isRecording,
    recordingSeconds,
    flash,
    toggleFlash,
    hasTorchSupport,
    isMuted,
    setIsMuted,
    activeFilter,
    setActiveFilter,
    zoomLevel,
    applyZoom,
    beauty,
    setBeauty,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    startRecording,
    stopRecording,
    getComputedFilterStyle,
    filters,
  } = useCamera();

  const { memories, saveMemory } = useMemories();
  const { friends, sendSnapToFriend } = useChat();
  const { addSnapToMyStory } = useStories();
  const { currentUser } = useAuth();

  // In-camera capture preview states
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [recordedVideoData, setRecordedVideoData] = useState(null);
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [videoFilter, setVideoFilter] = useState(FILTERS[0]);
  const [videoCaption, setVideoCaption] = useState('');
  const [showVideoCaptionInput, setShowVideoCaptionInput] = useState(false);
  const previewVideoRef = useRef(null);

  // High-Performance Face Tracking & AR Face Lenses (Zero React re-renders for coordinate stream)
  const {
    facesRef,
    isFaceDetected,
    activeFaceLens,
    activeFaceLensRef,
    setActiveFaceLens,
  } = useFaceTracking(videoRef, !capturedPhotoUrl && !recordedVideoData);

  // Live Canvas 60 FPS animation reference for AR Filters
  const arCanvasRef = useRef(null);
  const recordCanvasRef = useRef(null);
  const isRecordingCompositeRef = useRef(false);

  // Controls & UI drawers
  const [lensMode, setLensMode] = useState('ar_lenses'); // 'ar_lenses' | 'filters'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [showFilterSearch, setShowFilterSearch] = useState(false);
  const [showBeautyPanel, setShowBeautyPanel] = useState(false);
  const [isBeautyCollapsed, setIsBeautyCollapsed] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [isFlippingLens, setIsFlippingLens] = useState(false);
  const [isRetryingCamera, setIsRetryingCamera] = useState(false);
  const [isSoundEffectsMuted, setIsSoundEffectsMuted] = useState(isSoundMuted());
  const cameraOpenedSoundPlayedRef = useRef(false);

  // Reference for facingMode so 60 FPS animation loop has zero effect re-binding
  const facingModeRef = useRef(facingMode);
  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  // Canvas Resolution Synchronization (Zero Layout Thrashing inside animation frame loop)
  useEffect(() => {
    const canvas = arCanvasRef.current;
    if (!canvas) return;

    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const targetW = Math.round(rect.width);
        const targetH = Math.round(rect.height);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
      }
    };

    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    observer.observe(canvas);
    window.addEventListener('resize', syncCanvasSize, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, []);

  // 60 FPS Continuous AR Filter Animation Loop (Mounted once, NEVER restarts on filter switches)
  useEffect(() => {
    let animId = null;

    const renderLoop = (time) => {
      const canvas = arCanvasRef.current;
      const video = videoRef.current;

      if (canvas && video) {
        const width = canvas.width;
        const height = canvas.height;

        if (width > 0 && height > 0) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, width, height);

          const currentLens = activeFaceLensRef.current;
          const currentFaces = facesRef.current;

          if (currentLens && currentLens !== 'none' && currentFaces && currentFaces.length > 0) {
            renderArFilterOnCanvas(
              ctx,
              currentLens,
              currentFaces,
              width,
              height,
              facingModeRef.current,
              time / 1000
            );
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []); // Mounted once: permanent 60 FPS loop with instant filter switches

  // Memoized filter lists for zero-overhead filter switching
  const filteredArFilters = useMemo(() => {
    return AR_FILTERS.filter((f) => {
      if (f.id === 'none') return true;
      const matchCategory =
        selectedCategory === 'All' ||
        f.category === selectedCategory ||
        (f.tags && f.tags.includes(selectedCategory.toLowerCase()));
      const matchQuery =
        !filterSearchQuery.trim() ||
        f.name.toLowerCase().includes(filterSearchQuery.toLowerCase()) ||
        (f.tags && f.tags.some((t) => t.includes(filterSearchQuery.toLowerCase())));
      return matchCategory && matchQuery;
    });
  }, [selectedCategory, filterSearchQuery]);

  const handleSelectFaceLens = useCallback(
    (lensId) => {
      playFilterPopSound();
      setActiveFaceLens(lensId);
    },
    [setActiveFaceLens]
  );

  const handleSelectColorFilter = useCallback(
    (filter) => {
      playFilterPopSound();
      setActiveFilter(filter);
    },
    [setActiveFilter]
  );

  // Play subtle camera open chime once when live stream is successfully initialized
  useEffect(() => {
    if (!isLoading && hasPermission === true && !cameraOpenedSoundPlayedRef.current) {
      cameraOpenedSoundPlayedRef.current = true;
      playCameraOpenSound();
    }
  }, [isLoading, hasPermission]);

  // Apply preselected filter or AR lens from navigation state
  useEffect(() => {
    if (location.state?.preselectedFilterId) {
      const match = filters.find((f) => f.id === location.state.preselectedFilterId);
      if (match) {
        setActiveFilter(match);
        setLensMode('filters');
      }
    }
    if (location.state?.preselectedArFilterId) {
      setActiveFaceLens(location.state.preselectedArFilterId);
      setLensMode('ar_lenses');
    }
  }, [location.state, filters, setActiveFilter, setActiveFaceLens]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Ensure live video element has stream attached and playing
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((err) => {
        console.debug('Autoplay video play catch:', err);
      });
    }
  }, [isLoading, hasPermission, streamRef, videoRef]);

  // Format recording seconds to mm:ss
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  };

  // Switch between Photo and Video mode with tactile mode sound
  const handleSelectMode = (newMode) => {
    if (newMode === mode || isRecording) return;
    initAudio();
    if (newMode === 'photo') {
      playPhotoModeSound();
    } else if (newMode === 'video') {
      playVideoModeSound();
    }
    setMode(newMode);
  };

  // Toggle Camera Sound Effects ON / OFF and remember preference
  const handleToggleSoundEffects = () => {
    initAudio();
    const next = toggleSoundMuted();
    setIsSoundEffectsMuted(next);
    if (next) {
      toast('Camera Sounds: OFF', { icon: '🔇' });
    } else {
      playFilterPopSound();
      toast.success('Camera Sounds: ON', { icon: '🔊' });
    }
  };

  // Switch between front/rear camera safely
  const handleSwitchCamera = async () => {
    initAudio();
    if (availableDevices.length === 1) {
      toast('Only 1 camera input detected on this device', { icon: 'ℹ️' });
    }
    playCameraSwitchSound();
    setIsFlippingLens(true);
    try {
      await switchCamera();
    } catch (err) {
      console.warn('Switch camera error caught:', err);
    } finally {
      setTimeout(() => setIsFlippingLens(false), 350);
    }
  };

  // Safe retry handler for Try Again button
  const handleRetryCamera = async () => {
    if (isRetryingCamera || isLoading) return;
    initAudio();
    setIsRetryingCamera(true);
    try {
      await startCamera();
    } catch (err) {
      console.warn('Camera retry failed:', err);
    } finally {
      setIsRetryingCamera(false);
    }
  };

  // Capture Photo or Start/Stop Video
  const handleShutter = async () => {
    if (isCapturing) return;
    initAudio();

    if (mode === 'photo') {
      setIsCapturing(true);
      setFlashAnimation(true);
      playShutterSound();

      setTimeout(() => setFlashAnimation(false), 200);

      // Pass AR face lens overlay callback to composite onto canvas snapshot
      const photoDataUrl = capturePhoto((ctx, width, height, currentFacing) => {
        const currentLens = activeFaceLensRef.current;
        const currentFaces = facesRef.current;
        if (currentLens && currentLens !== 'none' && currentFaces && currentFaces.length > 0) {
          renderArFilterOnCanvas(
            ctx,
            currentLens,
            currentFaces,
            width,
            height,
            currentFacing,
            performance.now() / 1000
          );
        }
      });

      if (photoDataUrl) {
        // Open the photo editing interface immediately after capturing
        navigate('/editor', {
          state: {
            dataUrl: photoDataUrl,
            type: 'photo',
            filter: activeFilter.name,
            arLens: activeFaceLens,
          },
        });
      } else {
        toast.error('Unable to capture camera frame. Check permissions.');
      }
      setIsCapturing(false);
    } else {
      // Video mode
      if (isRecording) {
        playRecordStopSound();
        isRecordingCompositeRef.current = false;
        recordCanvasRef.current = null;
        const result = await stopRecording();
        if (result && result.videoUrl) {
          setRecordedVideoData(result);
          setVideoFilter(activeFilter);
          setIsPreviewMuted(false);
          setIsPreviewPlaying(true);
        }
      } else {
        playRecordStartSound();

        const video = videoRef.current;
        const hasBeautyApplied =
          beauty.smoothing > 0 ||
          beauty.brightness !== 100 ||
          beauty.contrast !== 100 ||
          beauty.saturation !== 100;
        const needsComposite =
          (activeFaceLens && activeFaceLens !== 'none') ||
          (activeFilter && activeFilter.id !== 'original') ||
          hasBeautyApplied;

        if (needsComposite && video && video.videoWidth > 0) {
          const recordCanvas = document.createElement('canvas');
          recordCanvas.width = video.videoWidth || 1280;
          recordCanvas.height = video.videoHeight || 720;
          const ctx = recordCanvas.getContext('2d');

          recordCanvasRef.current = recordCanvas;
          isRecordingCompositeRef.current = true;

          const renderRecordFrame = () => {
            if (!isRecordingCompositeRef.current) return;

            ctx.save();
            const filterStyle = getComputedFilterStyle();
            if (filterStyle) ctx.filter = filterStyle;

            if (facingMode === 'user') {
              ctx.translate(recordCanvas.width, 0);
              ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, recordCanvas.width, recordCanvas.height);
            ctx.restore();

            const currentLens = activeFaceLensRef.current;
            const currentFaces = facesRef.current;
            if (currentLens && currentLens !== 'none' && currentFaces && currentFaces.length > 0) {
              renderArFilterOnCanvas(
                ctx,
                currentLens,
                currentFaces,
                recordCanvas.width,
                recordCanvas.height,
                'environment',
                performance.now() / 1000
              );
            }

            requestAnimationFrame(renderRecordFrame);
          };

          renderRecordFrame();

          const canvasStream = recordCanvas.captureStream(30);

          if (streamRef.current) {
            const audioTracks = streamRef.current.getAudioTracks();
            if (audioTracks.length > 0) {
              canvasStream.addTrack(audioTracks[0]);
            }
          }

          startRecording(canvasStream);
          toast('Recording video with AR filter...', { icon: '🔴' });
        } else {
          startRecording();
          toast('Recording video clip...', { icon: '🔴' });
        }
      }
    }
  };

  // Discard preview and retake
  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    setRecordedVideoData(null);
    setVideoCaption('');
    setShowVideoCaptionInput(false);
    toast('Camera ready for new snap');
  };

  // Save captured photo (persists to Memories & uploads to Firebase Storage/Firestore)
  const handleSavePhoto = async () => {
    if (!capturedPhotoUrl) return;

    const snapTitle = activeFaceLens !== 'none' ? `AR Lens (${activeFaceLens}) Snap` : 'Camera Snap';

    try {
      const uploadRes = await uploadMediaToCloud({
        dataUrl: capturedPhotoUrl,
        type: 'photo',
        filter: activeFilter.name,
        caption: snapTitle,
        visibility: 'private',
        userId: currentUser?.uid,
      });

      await saveMemory({
        type: 'photo',
        dataUrl: capturedPhotoUrl,
        url: capturedPhotoUrl,
        filter: activeFilter.name,
        title: snapTitle,
        cloudId: uploadRes.cloudId,
        storagePath: uploadRes.storagePath,
        isLocal: uploadRes.isLocal,
      });
    } catch (e) {
      console.debug('Cloud upload fallback:', e);
      await saveMemory({
        type: 'photo',
        dataUrl: capturedPhotoUrl,
        url: capturedPhotoUrl,
        filter: activeFilter.name,
        title: snapTitle,
      });
    }

    const a = document.createElement('a');
    a.href = capturedPhotoUrl;
    a.download = `snaplens_photo_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success('Photo saved & downloaded!', { icon: '💾' });

    if (location.state?.sendToFriendId) {
      sendSnapToFriend(location.state.sendToFriendId, { snapUrl: capturedPhotoUrl, type: 'photo' });
      navigate('/chat');
      return;
    }

    setCapturedPhotoUrl(null);
  };

  // 1-Tap Add Photo to 24h My Story
  const handleAddPhotoToStory = async () => {
    if (!capturedPhotoUrl) return;
    await addSnapToMyStory({
      type: 'photo',
      url: capturedPhotoUrl,
      filter: activeFilter.name,
      caption: 'Live Camera Snap',
    });
    toast.success('Snap added to My Story! (24h)', { icon: '✨' });
    navigate('/stories');
  };

  // Open photo in Studio Editor
  const handleOpenPhotoInEditor = () => {
    if (!capturedPhotoUrl) return;
    navigate('/editor', {
      state: {
        dataUrl: capturedPhotoUrl,
        type: 'photo',
        filter: activeFilter.name,
      },
    });
  };

  // 1-Tap Add Video to 24h My Story
  const handleAddVideoToStory = async () => {
    if (!recordedVideoData) return;
    await addSnapToMyStory({
      type: 'video',
      url: recordedVideoData.videoUrl,
      fileBlob: recordedVideoData.blob,
      filter: videoFilter?.name || activeFilter.name,
      caption: videoCaption || 'Live Video Snap',
      duration: recordingSeconds || 5,
    });
    toast.success('Video snap added to My Story! (24h)', { icon: '✨' });
    navigate('/stories');
  };

  // Save recorded video (download locally + persist in Memories + cloud upload)
  const handleSaveVideo = async () => {
    if (!recordedVideoData) return;

    const finalFilterName = videoFilter?.name || activeFilter.name;
    const finalDuration = recordingSeconds || 5;
    const videoTitle = videoCaption ? `Video Snap: ${videoCaption}` : 'Camera Video Snap';

    // Cloud upload attempt
    try {
      const uploadRes = await uploadMediaToCloud({
        fileBlob: recordedVideoData.blob,
        type: 'video',
        filter: finalFilterName,
        duration: finalDuration,
        caption: videoTitle,
        visibility: 'private',
        userId: currentUser?.uid,
      });

      await saveMemory({
        type: 'video',
        url: recordedVideoData.videoUrl,
        filter: finalFilterName,
        duration: finalDuration,
        title: videoTitle,
        cloudId: uploadRes.cloudId,
        storagePath: uploadRes.storagePath,
        isLocal: uploadRes.isLocal,
      });
    } catch (e) {
      console.debug('Cloud upload fallback:', e);
      await saveMemory({
        type: 'video',
        url: recordedVideoData.videoUrl,
        filter: finalFilterName,
        duration: finalDuration,
        title: videoTitle,
      });
    }

    // Direct download
    const a = document.createElement('a');
    a.href = recordedVideoData.videoUrl;
    const ext = recordedVideoData.mimeType?.includes('mp4') ? 'mp4' : 'webm';
    a.download = `snaplens_video_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success('Video downloaded & saved to Memories!', { icon: '🎥' });

    if (location.state?.sendToFriendId) {
      sendSnapToFriend(location.state.sendToFriendId, {
        snapUrl: recordedVideoData.videoUrl,
        type: 'video',
        caption: videoCaption,
      });
      navigate('/chat');
      return;
    }

    setRecordedVideoData(null);
  };

  // Open recorded video in Studio Editor
  const handleOpenVideoInEditor = () => {
    if (!recordedVideoData) return;
    navigate('/editor', {
      state: {
        videoUrl: recordedVideoData.videoUrl,
        type: 'video',
        filter: videoFilter?.name || activeFilter.name,
        caption: videoCaption,
      },
    });
  };

  // Spacebar hotkey to capture
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        document.activeElement.tagName !== 'INPUT' &&
        !capturedPhotoUrl &&
        !recordedVideoData
      ) {
        e.preventDefault();
        initAudio();
        handleShutter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShutter, capturedPhotoUrl, recordedVideoData]);

  // Permission Denied / Camera Error UI with diagnostic classification & troubleshooting steps
  if (hasPermission === false || errorMessage) {
    const errorTitle = errorDetails?.title || 'Camera Unavailable';
    const errorMsg = errorDetails?.message || errorMessage || 'SnapLens requires access to your camera to stream and capture snaps.';
    const troubleshootingList = errorDetails?.troubleshooting || [
      'Tap the Camera / Lock icon in your browser address bar.',
      'Select "Always allow" for camera permissions.',
      'Click "Try Again" below to connect the live stream.',
    ];
    const errorCode = errorDetails?.code || 'GENERIC';

    return (
      <div className="fixed inset-0 bg-[#0A0A0F] text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full border border-red-500/25 shadow-2xl my-auto"
        >
          {/* Diagnostic Icon & Code Badge */}
          <div className="relative w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400 shadow-inner">
            {errorCode === 'NOT_ALLOWED' && <ShieldAlert className="w-8 h-8 text-amber-400" />}
            {errorCode === 'NOT_READABLE' && <VideoOff className="w-8 h-8 text-red-400" />}
            {errorCode === 'NOT_FOUND' && <CameraOff className="w-8 h-8 text-orange-400" />}
            {errorCode === 'SECURITY' && <Lock className="w-8 h-8 text-red-400" />}
            {errorCode === 'OVERCONSTRAINED' && <Sliders className="w-8 h-8 text-yellow-400" />}
            {errorCode !== 'NOT_ALLOWED' &&
             errorCode !== 'NOT_READABLE' &&
             errorCode !== 'NOT_FOUND' &&
             errorCode !== 'SECURITY' &&
             errorCode !== 'OVERCONSTRAINED' && <AlertCircle className="w-8 h-8 text-red-400" />}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold tracking-wider uppercase mb-3 border border-red-500/20">
            <span>{errorCode.replace(/_/g, ' ')}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black mb-2 text-white">{errorTitle}</h2>
          <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-6">
            {errorMsg}
          </p>

          {/* Contextual Troubleshooting Steps */}
          <div className="bg-white/5 rounded-2xl p-4 mb-6 text-left text-xs text-white/70 space-y-2.5 border border-white/5">
            <div className="font-bold text-[#FFFC00] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-[#FFFC00]" />
              <span>Recommended Solutions:</span>
            </div>
            <ol className="space-y-1.5 list-decimal list-inside pl-0.5 text-white/80">
              {troubleshootingList.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetryCamera}
              disabled={isRetryingCamera || isLoading}
              className="w-full btn-snap py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-black ${isRetryingCamera || isLoading ? 'animate-spin' : ''}`} />
              <span>{isRetryingCamera || isLoading ? 'Connecting Camera...' : 'Try Again'}</span>
            </button>

            <button
              onClick={() => {
                stopCamera();
                navigate('/');
              }}
              className="w-full glass-pill py-2.5 text-xs font-semibold text-white/60 hover:text-white transition-colors"
            >
              Return to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active first face for AR rendering
  const activeFace = facesRef.current && facesRef.current.length > 0 ? facesRef.current[0] : null;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden select-none touch-none">
      {/* Recording Top Progress Bar & Vignette */}
      {isRecording && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/20 z-50 overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-1000 shadow-lg shadow-red-500/50"
              style={{ width: `${Math.min(100, (recordingSeconds / 60) * 100)}%` }}
            />
          </div>
          <div className="absolute inset-0 pointer-events-none ring-4 ring-inset ring-red-600/50 animate-pulse z-20" />
        </>
      )}

      {/* Screen flash white opacity effect on photo snap */}
      <AnimatePresence>
        {flashAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* TOP BAR CONTROLS (Hidden when previewing captured snap) */}
      {!capturedPhotoUrl && !recordedVideoData && (
        <header className="absolute top-0 left-0 right-0 z-30 pt-safe p-2.5 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent">
          {/* Left: Close button & Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                stopCamera();
                navigate('/');
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-pill flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              aria-label="Close Camera"
              title="Close Camera"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              <div className="w-4 h-4 rounded-md snap-gradient flex items-center justify-center">
                <Camera className="w-2.5 h-2.5 text-black" />
              </div>
              <span className="font-extrabold text-xs tracking-tight text-white hidden xs:inline">SnapLens</span>
            </div>
          </div>

          {/* Center: Live Recording Timer or Face Tracked Pill */}
          {isRecording ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-600/95 backdrop-blur-md border border-red-400/50 shadow-lg shadow-red-600/50"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span className="font-mono font-bold text-xs tracking-wider text-white">
                🔴 REC {formatTime(recordingSeconds)} / 01:00
              </span>
            </motion.div>
          ) : activeFaceLens !== 'none' && isFaceDetected ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFFC00]/20 backdrop-blur-md border border-[#FFFC00]/40 text-[#FFFC00] text-[11px] font-bold shadow-md"
            >
              <Sparkles className="w-3 h-3 text-[#FFFC00]" />
              <span>Face Tracked: {AR_FILTERS.find((l) => l.id === activeFaceLens)?.name || 'Active'}</span>
            </motion.div>
          ) : null}

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Flash / Torch Toggle */}
            <button
              onClick={toggleFlash}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-pill flex items-center justify-center transition-all ${
                flash ? 'bg-[#FFFC00]/25 text-[#FFFC00] border-[#FFFC00]/60' : 'text-white/80'
              }`}
              title="Toggle Flash/Torch"
            >
              {flash ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>

            {/* Camera Sound Effects Toggle (ON / Muted) */}
            <button
              onClick={handleToggleSoundEffects}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-pill flex items-center justify-center transition-all ${
                isSoundEffectsMuted
                  ? 'text-red-400 border border-red-500/30 bg-red-500/10'
                  : 'text-[#FFFC00] border border-[#FFFC00]/30 hover:border-[#FFFC00]/60'
              }`}
              title={isSoundEffectsMuted ? 'Turn Camera Sounds ON' : 'Mute Camera Sounds'}
              aria-label={isSoundEffectsMuted ? 'Camera Sounds Muted' : 'Camera Sounds Active'}
            >
              {isSoundEffectsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Grid Lines Toggle */}
            <button
              onClick={() => setShowGrid((p) => !p)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-pill hidden xs:flex items-center justify-center transition-all ${
                showGrid ? 'text-[#FFFC00] border-[#FFFC00]/40' : 'text-white/80'
              }`}
              title="Toggle Rule of Thirds Grid"
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Beauty Tuning Toggle */}
            <button
              onClick={() => setShowBeautyPanel((p) => !p)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-pill flex items-center justify-center transition-all ${
                showBeautyPanel ? 'bg-[#FFFC00] text-black shadow-lg shadow-[#FFFC00]/30' : 'text-white/80'
              }`}
              title="Beauty Tuning"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              onClick={() => {
                stopCamera();
                navigate('/settings');
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-pill flex items-center justify-center text-white/80 hover:text-white"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* CENTER CAMERA VIEWPORT / PREVIEW CONTAINER */}
      <main className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-[#0A0A0F] flex flex-col items-center justify-center">
            <div className="relative w-14 h-14 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-[#FFFC00] border-t-transparent animate-spin" />
            </div>
            <p className="text-white/60 text-xs sm:text-sm font-medium tracking-wide">
              Connecting Camera Stream...
            </p>
          </div>
        )}

        {/* Real Live Camera Video Feed from MediaDevices API */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isFlippingLens ? 'scale-90 rotate-180 opacity-50 blur-sm' : ''
          }`}
          style={{
            filter: getComputedFilterStyle(),
            WebkitFilter: getComputedFilterStyle(),
            transform: `${facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)'} scale(${zoomLevel})`,
            willChange: 'filter, transform',
          }}
        />

        {/* Live 60 FPS Canvas AR Overlay (MediaPipe & Procedural Vector Filter Engine) */}
        {!capturedPhotoUrl && !recordedVideoData && (
          <canvas
            ref={arCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          />
        )}

        {/* Gentle Face Guidance Badge when AR Lens is Selected but No Face in Frame */}
        {activeFaceLens !== 'none' && !isFaceDetected && !isLoading && !capturedPhotoUrl && !recordedVideoData && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-3.5 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-[#FFFC00]/40 text-white text-xs font-semibold flex items-center gap-2 shadow-xl"
            >
              <span className="w-2 h-2 rounded-full bg-[#FFFC00] animate-ping" />
              <span>Looking for a face...</span>
            </motion.div>
          </div>
        )}

        {/* Rule of Thirds Grid Overlay */}
        {showGrid && !capturedPhotoUrl && !recordedVideoData && (
          <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div />
          </div>
        )}

        {/* Zoom Controls */}
        {!capturedPhotoUrl && !recordedVideoData && (
          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 sm:gap-2 bg-black/45 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl">
            <button
              onClick={() => applyZoom(zoomLevel + 0.25)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl glass-pill flex items-center justify-center hover:scale-110 active:scale-95 text-white/80"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#FFFC00] py-0.5">
              {zoomLevel.toFixed(1)}x
            </span>

            <button
              onClick={() => applyZoom(zoomLevel - 0.25)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl glass-pill flex items-center justify-center hover:scale-110 active:scale-95 text-white/80"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Filter Pill */}
        {activeFilter && activeFilter.id !== 'original' && !capturedPhotoUrl && !recordedVideoData && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-[#FFFC00] flex items-center gap-1.5 shadow-lg"
            >
              <Sparkles className="w-3 h-3 text-[#FFFC00]" />
              <span>{activeFilter.name}</span>
            </motion.div>
          </div>
        )}

        {/* Beauty Tuning Drawer (Collapsible & Non-Overlapping Mobile Architecture) */}
        <AnimatePresence>
          {showBeautyPanel && !capturedPhotoUrl && !recordedVideoData && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`absolute z-40 glass-panel rounded-3xl border border-white/20 shadow-2xl touch-auto pointer-events-auto transition-all ${
                isBeautyCollapsed
                  ? 'top-16 right-3 sm:right-6 p-1.5 w-auto'
                  : 'top-16 right-3 sm:right-6 sm:top-1/2 sm:-translate-y-1/2 w-[calc(100vw-24px)] max-w-xs sm:w-80 p-3.5 sm:p-5 max-h-[50vh] sm:max-h-[75vh] overflow-y-auto no-scrollbar'
              }`}
            >
              {isBeautyCollapsed ? (
                // Collapsed Mini Pill: Tap to re-expand without leaving camera
                <button
                  onClick={() => setIsBeautyCollapsed(false)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white hover:text-[#FFFC00] transition-colors focus:outline-none"
                  title="Expand Beauty Panel"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#FFFC00]" />
                  <span className="text-[11px] font-bold text-[#FFFC00]">Beauty Active</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                </button>
              ) : (
                // Full Expanded Beauty & Tuning Interface
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#FFFC00]" />
                      <span className="font-bold text-xs sm:text-sm text-white">Beauty & Tuning</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsBeautyCollapsed(true)}
                        className="w-6 h-6 rounded-full glass-pill flex items-center justify-center text-white/70 hover:text-white"
                        title="Collapse panel"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setShowBeautyPanel(false)}
                        className="w-6 h-6 rounded-full glass-pill flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                        title="Close Beauty Panel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="mb-3">
                    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider block mb-1">
                      Quick Presets
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: 'Natural', config: { smoothing: 0, brightness: 100, contrast: 100, saturation: 100 } },
                        { label: 'Glow', config: { smoothing: 1.5, brightness: 108, contrast: 102, saturation: 105 } },
                        { label: 'Porcelain', config: { smoothing: 2.5, brightness: 112, contrast: 98, saturation: 95 } },
                        { label: 'Warm', config: { smoothing: 1.0, brightness: 106, contrast: 108, saturation: 118 } },
                      ].map((preset) => {
                        const isActive =
                          beauty.smoothing === preset.config.smoothing &&
                          beauty.brightness === preset.config.brightness &&
                          beauty.contrast === preset.config.contrast &&
                          beauty.saturation === preset.config.saturation;
                        return (
                          <button
                            key={preset.label}
                            onClick={() => {
                              setBeauty(preset.config);
                              playFilterPopSound();
                            }}
                            className={`py-1 px-1 rounded-lg text-[10px] font-bold text-center transition-all ${
                              isActive
                                ? 'bg-[#FFFC00] text-black shadow-md shadow-[#FFFC00]/30'
                                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Smoothing */}
                    <div>
                      <div className="flex justify-between mb-1 font-medium">
                        <span className="text-white/80">Skin Smoothing</span>
                        <span className="text-[#FFFC00] font-mono font-bold">
                          {(Math.round(beauty.smoothing * 10) / 10).toFixed(1)}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.25"
                        value={beauty.smoothing}
                        onInput={(e) =>
                          setBeauty((prev) => ({
                            ...prev,
                            smoothing: parseFloat(Number(e.target.value).toFixed(2)),
                          }))
                        }
                        onChange={(e) =>
                          setBeauty((prev) => ({
                            ...prev,
                            smoothing: parseFloat(Number(e.target.value).toFixed(2)),
                          }))
                        }
                        className="snap-slider"
                      />
                    </div>

                    {/* Brightness */}
                    <div>
                      <div className="flex justify-between mb-1 font-medium">
                        <span className="text-white/80">Brightness</span>
                        <span className="text-[#FFFC00] font-mono font-bold">{beauty.brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="140"
                        step="2"
                        value={beauty.brightness}
                        onInput={(e) =>
                          setBeauty((prev) => ({
                            ...prev,
                            brightness: parseInt(e.target.value, 10),
                          }))
                        }
                        onChange={(e) =>
                          setBeauty((prev) => ({
                            ...prev,
                            brightness: parseInt(e.target.value, 10),
                          }))
                        }
                        className="snap-slider"
                      />
                    </div>

                    {/* Contrast */}
                    <div>
                      <div className="flex justify-between mb-1 font-medium">
                        <span className="text-white/80">Contrast</span>
                        <span className="text-[#FFFC00] font-mono font-bold">{beauty.contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="140"
                        step="2"
                        value={beauty.contrast}
                        onInput={(e) =>
                          setBeauty((prev) => ({
                            ...prev,
                            contrast: parseInt(e.target.value, 10),
                          }))
                        }
                        onChange={(e) =>
                          setBeauty((prev) => ({
                            ...prev,
                            contrast: parseInt(e.target.value, 10),
                          }))
                        }
                        className="snap-slider"
                      />
                    </div>

                    {/* Saturation */}
                    <div>
                      <div className="flex justify-between mb-1 font-medium">
                        <span className="text-white/80">Saturation</span>
                        <span className="text-[#FFFC00] font-mono font-bold">{beauty.saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="180"
                        step="5"
                        value={beauty.saturation}
                        onInput={(e) =>
                          setBeauty((prev) => ({
                            ...prev,
                            saturation: parseInt(e.target.value, 10),
                          }))
                        }
                        onChange={(e) =>
                          setBeauty((prev) => ({
                            ...prev,
                            saturation: parseInt(e.target.value, 10),
                          }))
                        }
                        className="snap-slider"
                      />
                    </div>
                  </div>

                  {/* Reset Defaults Button */}
                  {(() => {
                    const isModified =
                      beauty.smoothing > 0 ||
                      beauty.brightness !== 100 ||
                      beauty.contrast !== 100 ||
                      beauty.saturation !== 100;
                    return (
                      <button
                        onClick={() => {
                          setBeauty({ smoothing: 0, brightness: 100, contrast: 100, saturation: 100 });
                          playFilterPopSound();
                          toast('Beauty settings reset to defaults', { icon: '✨' });
                        }}
                        disabled={!isModified}
                        className={`w-full mt-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isModified
                            ? 'border border-[#FFFC00]/50 bg-[#FFFC00]/15 hover:bg-[#FFFC00]/25 text-[#FFFC00] shadow-md shadow-[#FFFC00]/15 active:scale-95 cursor-pointer'
                            : 'bg-white/5 text-white/30 border border-transparent cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isModified ? 'text-[#FFFC00]' : 'text-white/30'}`} />
                        <span>Reset Defaults</span>
                      </button>
                    );
                  })()}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PHOTO CAPTURED PREVIEW OVERLAY ── */}
        {capturedPhotoUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-40 bg-black flex flex-col justify-between"
          >
            {/* Captured image display */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
              <img
                src={capturedPhotoUrl}
                alt="Captured Snap"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Bottom Preview Actions Toolbar */}
            <div className="p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-wrap items-center justify-between gap-3">
              {/* Retake Photo */}
              <button
                onClick={handleRetake}
                className="glass-pill px-5 py-3 rounded-full text-xs sm:text-sm font-bold text-white flex items-center gap-2 hover:bg-white/15 active:scale-95 transition-transform"
              >
                <RotateCcw className="w-4 h-4 text-white/80" />
                <span>Retake</span>
              </button>

              <div className="flex items-center gap-2.5">
                {/* 1-Tap Add to Story */}
                <button
                  onClick={handleAddPhotoToStory}
                  className="glass-pill px-4 sm:px-5 py-3 rounded-full text-xs sm:text-sm font-bold text-white border-white/20 hover:border-[#FFFC00]/40 hover:bg-white/10 flex items-center gap-2 active:scale-95 transition-transform"
                >
                  <Play className="w-4 h-4 text-[#FFFC00] fill-current" />
                  <span>Story</span>
                </button>

                {/* Edit in Studio */}
                <button
                  onClick={handleOpenPhotoInEditor}
                  className="glass-pill px-4 sm:px-5 py-3 rounded-full text-xs sm:text-sm font-bold text-[#FFFC00] border-[#FFFC00]/30 hover:bg-[#FFFC00]/10 flex items-center gap-2 active:scale-95 transition-transform"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>

                {/* Save Photo */}
                <button
                  onClick={handleSavePhoto}
                  className="btn-snap px-6 py-3 rounded-full text-xs sm:text-sm font-bold text-black flex items-center gap-2 shadow-lg shadow-[#FFFC00]/25 active:scale-95 transition-transform"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Snap</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── VIDEO CAPTURED PREVIEW OVERLAY ── */}
        {recordedVideoData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-40 bg-black flex flex-col justify-between overflow-hidden"
          >
            {/* Top Preview Controls Bar */}
            <div className="z-30 p-3 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent">
              {/* Duration & File Size Badges */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-xs font-mono font-bold text-[#FFFC00]">
                  {formatTime(recordingSeconds || 5)}
                </span>
                {recordedVideoData.size && (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-mono text-white/70">
                    {(recordedVideoData.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>

              {/* Top Action Icons: Audio Mute & Caption */}
              <div className="flex items-center gap-2">
                {/* Audio Toggle */}
                <button
                  onClick={() => {
                    const next = !isPreviewMuted;
                    setIsPreviewMuted(next);
                    if (previewVideoRef.current) previewVideoRef.current.muted = next;
                  }}
                  className={`w-9 h-9 rounded-full glass-pill flex items-center justify-center transition-all ${
                    isPreviewMuted ? 'text-red-400' : 'text-[#FFFC00]'
                  }`}
                  title={isPreviewMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isPreviewMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Add Caption */}
                <button
                  onClick={() => setShowVideoCaptionInput((p) => !p)}
                  className={`w-9 h-9 rounded-full glass-pill flex items-center justify-center transition-all ${
                    videoCaption ? 'bg-[#FFFC00] text-black shadow-md' : 'text-white/80'
                  }`}
                  title="Add Caption"
                >
                  <Type className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video preview player */}
            <div
              className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => {
                const v = previewVideoRef.current;
                if (!v) return;
                if (v.paused) {
                  v.play();
                  setIsPreviewPlaying(true);
                } else {
                  v.pause();
                  setIsPreviewPlaying(false);
                }
              }}
            >
              <video
                ref={previewVideoRef}
                src={recordedVideoData.videoUrl}
                playsInline
                loop
                autoPlay
                muted={isPreviewMuted}
                className="w-full h-full object-contain"
                style={{
                  filter: videoFilter.css !== 'none' ? videoFilter.css : undefined,
                }}
              />

              {/* Play/Pause indicator icon */}
              {!isPreviewPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-[#FFFC00] shadow-2xl">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Floating Caption Banner on Video */}
              {videoCaption && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-white font-black text-sm tracking-wide shadow-2xl text-center max-w-[85%]">
                  {videoCaption}
                </div>
              )}
            </div>

            {/* Caption Input Popover */}
            <AnimatePresence>
              {showVideoCaptionInput && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="z-30 px-4 py-2 bg-black/80 backdrop-blur-md border-t border-b border-white/10 flex items-center gap-2 max-w-lg mx-auto w-full"
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="Add video caption..."
                    value={videoCaption}
                    onChange={(e) => setVideoCaption(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setShowVideoCaptionInput(false)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:ring-1 focus:ring-[#FFFC00]"
                  />
                  <button
                    onClick={() => setShowVideoCaptionInput(false)}
                    className="btn-snap px-3 py-1.5 rounded-xl text-xs font-bold text-black"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter Selection Strip on Recorded Video */}
            <div className="z-30 px-3 py-1.5 bg-black/65 backdrop-blur-md border-t border-white/8 flex items-center gap-2 overflow-x-auto no-scrollbar max-w-lg mx-auto w-full">
              {filters.map((f) => {
                const isSelected = videoFilter.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      playFilterPopSound();
                      setVideoFilter(f);
                    }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#FFFC00] text-black shadow-md scale-105'
                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: f.color || '#fff' }}
                    />
                    <span>{f.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Preview Actions Toolbar */}
            <div className="p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-wrap items-center justify-between gap-3 z-30">
              {/* Retake Video */}
              <button
                onClick={handleRetake}
                className="glass-pill px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white flex items-center gap-2 hover:bg-white/15 active:scale-95 transition-transform"
              >
                <RotateCcw className="w-4 h-4 text-white/80" />
                <span>Retake</span>
              </button>

              <div className="flex items-center gap-2">
                {/* 1-Tap Add Video to Story */}
                <button
                  onClick={handleAddVideoToStory}
                  className="glass-pill px-3.5 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white border-white/20 hover:border-[#FFFC00]/40 hover:bg-white/10 flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Play className="w-4 h-4 text-[#FFFC00] fill-current" />
                  <span>Story</span>
                </button>

                {/* Edit in Studio */}
                <button
                  onClick={handleOpenVideoInEditor}
                  className="glass-pill px-3.5 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold text-[#FFFC00] border-[#FFFC00]/30 hover:bg-[#FFFC00]/10 flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit in Studio</span>
                </button>

                {/* Save & Upload Video */}
                <button
                  onClick={handleSaveVideo}
                  className="btn-snap px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold text-black flex items-center gap-2 shadow-lg shadow-[#FFFC00]/25 active:scale-95 transition-transform"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Video</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* BOTTOM CAMERA CONTROLS (Hidden when previewing captured snap) */}
      {!capturedPhotoUrl && !recordedVideoData && (
        <footer className="absolute bottom-0 left-0 right-0 z-30 pb-safe pb-2.5 sm:pb-5 pt-2 px-2 sm:px-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col items-center">
          {/* Header Bar of Controls: Tabs + Active Lens Badge + Categories/Search */}
          <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-2 mb-2 px-1">
            {/* Mode Switcher: AR Lenses vs Color LUTs */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-black/65 backdrop-blur-md border border-white/10 flex-shrink-0">
              <button
                onClick={() => setLensMode('ar_lenses')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  lensMode === 'ar_lenses'
                    ? 'bg-[#FFFC00] text-black shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
                <span>AR Lenses</span>
              </button>
              <button
                onClick={() => setLensMode('filters')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  lensMode === 'filters'
                    ? 'bg-[#FFFC00] text-black shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Color LUTs</span>
              </button>
            </div>

            {/* Active Lens / Filter Chip with Dismiss */}
            {activeFaceLens !== 'none' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFFC00]/20 border border-[#FFFC00]/40 text-xs font-bold text-white shadow-sm flex-shrink-0">
                <span>{AR_FILTERS.find((f) => f.id === activeFaceLens)?.icon}</span>
                <span className="text-[11px] text-[#FFFC00] font-bold truncate max-w-[90px]">
                  {AR_FILTERS.find((f) => f.id === activeFaceLens)?.name}
                </span>
                <button
                  onClick={() => {
                    playFilterPopSound();
                    setActiveFaceLens('none');
                  }}
                  className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white text-[10px]"
                  title="Remove Filter"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Category / Search Toggle */}
            {lensMode === 'ar_lenses' && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setShowFilterSearch((p) => !p)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    showFilterSearch || filterSearchQuery
                      ? 'bg-[#FFFC00] text-black'
                      : 'bg-white/10 text-white/70 hover:text-white'
                  }`}
                  title="Search Filters"
                >
                  <Search className="w-3 h-3" />
                </button>
                {!showFilterSearch && (
                  <div className="hidden sm:flex items-center gap-1">
                    {FILTER_CATEGORIES.slice(0, 4).map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight whitespace-nowrap transition-all ${
                            isSelected
                              ? 'bg-white text-black shadow-sm'
                              : 'bg-white/10 text-white/60 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search bar input if open */}
          {lensMode === 'ar_lenses' && showFilterSearch && (
            <div className="w-full max-w-xl mx-auto relative flex items-center mb-2 px-1">
              <input
                type="text"
                autoFocus
                placeholder="Search lenses (e.g. cat, crown, fire)..."
                value={filterSearchQuery}
                onChange={(e) => setFilterSearchQuery(e.target.value)}
                className="w-full px-3 py-1 text-xs rounded-full bg-black/75 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFFC00]"
              />
              {filterSearchQuery && (
                <button
                  onClick={() => setFilterSearchQuery('')}
                  className="absolute right-3 text-white/50 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Snapchat-Style Circular Lens Carousel */}
          <div className="w-full max-w-xl mx-auto flex items-center gap-3 sm:gap-4 overflow-x-auto touch-scroll-x no-scrollbar py-2 px-3 sm:px-4 mb-2">
            {lensMode === 'ar_lenses' ? (
              // 10 Interactive AR Face Filters (Instant Switch & Zero Latency)
              filteredArFilters.map((lens) => {
                const isSelected = activeFaceLens === lens.id;
                return (
                  <button
                    key={lens.id}
                    onClick={() => handleSelectFaceLens(lens.id)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none transition-transform active:scale-95 touch-manipulation cursor-pointer"
                  >
                    <div
                      className={`relative w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center text-2xl transition-transform duration-150 ${
                        isSelected
                          ? 'scale-110 shadow-lg shadow-[#FFFC00]/50 ring-2 ring-[#FFFC00] ring-offset-2 ring-offset-black bg-[#FFFC00]/25'
                          : 'opacity-75 group-hover:opacity-100 hover:scale-105 border border-white/20 bg-black/40'
                      }`}
                      style={{
                        background: isSelected
                          ? `radial-gradient(circle, ${lens.color}55 0%, #0E0E18 80%)`
                          : `radial-gradient(circle, ${lens.color}33 0%, #000 85%)`,
                      }}
                    >
                      <span className="drop-shadow-md select-none">{lens.icon}</span>
                    </div>
                    <span
                      className={`w-[76px] sm:w-[84px] text-[10px] sm:text-[11px] font-semibold tracking-tight text-center leading-tight line-clamp-2 break-words transition-colors ${
                        isSelected
                          ? 'text-[#FFFC00] font-bold drop-shadow-[0_1px_4px_rgba(255,252,0,0.4)]'
                          : 'text-white/70'
                      }`}
                    >
                      {lens.name}
                    </span>
                  </button>
                );
              })
            ) : (
              // 10 Color Filters
              filters.map((filter) => {
                const isSelected = activeFilter.id === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => handleSelectColorFilter(filter)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none active:scale-95 touch-manipulation cursor-pointer"
                  >
                    <div
                      className={`relative w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-transform duration-150 ${
                        isSelected
                          ? 'scale-110 shadow-lg shadow-[#FFFC00]/40 ring-2 ring-[#FFFC00] ring-offset-2 ring-offset-black'
                          : 'opacity-70 group-hover:opacity-100 hover:scale-105 border border-white/20 bg-black/40'
                      }`}
                      style={{
                        background: isSelected
                          ? `radial-gradient(circle, ${filter.color}55 0%, #111 80%)`
                          : `radial-gradient(circle, ${filter.color}33 0%, #000 85%)`,
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full shadow-md"
                        style={{ backgroundColor: filter.color || '#fff' }}
                      />
                    </div>
                    <span
                      className={`w-[76px] sm:w-[84px] text-[10px] sm:text-[11px] font-semibold tracking-tight text-center leading-tight line-clamp-2 break-words transition-colors ${
                        isSelected
                          ? 'text-[#FFFC00] font-bold drop-shadow-[0_1px_4px_rgba(255,252,0,0.4)]'
                          : 'text-white/70'
                      }`}
                    >
                      {filter.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Photo / Video Mode Selector */}
          <div className="flex items-center justify-center gap-6 mb-2 sm:mb-2.5 select-none">
            <button
              onClick={() => handleSelectMode('photo')}
              disabled={isRecording}
              className={`text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all py-1 px-3 rounded-full ${
                mode === 'photo'
                  ? 'text-[#FFFC00] scale-105 drop-shadow-[0_0_8px_rgba(255,252,0,0.6)]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Photo
            </button>
            <button
              onClick={() => handleSelectMode('video')}
              disabled={isRecording}
              className={`text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all py-1 px-3 rounded-full ${
                mode === 'video'
                  ? 'text-[#FFFC00] scale-105 drop-shadow-[0_0_8px_rgba(255,252,0,0.6)]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Video
            </button>
          </div>

          {/* Shutter Button Row */}
          <div className="w-full max-w-sm sm:max-w-md flex items-center justify-around px-3 sm:px-6">
            {/* Left: Memories / Gallery Button */}
            <button
              onClick={() => {
                stopCamera();
                navigate('/memories');
              }}
              className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl glass-pill flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              title="Open Memories"
            >
              <ImageIcon className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
              {memories.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full snap-gradient text-black text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md">
                  {memories.length > 99 ? '99+' : memories.length}
                </span>
              )}
            </button>

            {/* Center: Main Circular Capture Shutter */}
            <button
              onClick={handleShutter}
              disabled={isCapturing}
              className={`shutter-btn-outer ${isRecording ? 'recording' : ''}`}
              aria-label={
                mode === 'photo'
                  ? 'Take Photo'
                  : isRecording
                  ? 'Stop Recording'
                  : 'Start Recording'
              }
            >
              <div
                className={`shutter-btn-inner ${
                  mode === 'video' && !isRecording ? '!bg-red-500' : ''
                }`}
              />
            </button>

            {/* Right: Switch Front / Rear Lens */}
            <button
              onClick={handleSwitchCamera}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl glass-pill flex items-center justify-center hover:scale-105 active:scale-95 group transition-transform"
              title="Flip Lens (Front / Rear)"
            >
              <RefreshCw className="w-5 h-5 text-white/80 group-hover:text-white group-hover:rotate-180 transition-all duration-400" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}