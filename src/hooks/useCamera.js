import { useState, useRef, useEffect, useCallback } from 'react';

export const FILTERS = [
  { 
    id: 'original', 
    name: 'Original', 
    description: 'Natural unfiltered camera look with true colors',
    css: 'none',
    color: '#FFFC00'
  },
  { 
    id: 'vintage', 
    name: 'Vintage', 
    description: 'Classic warm 70s film tone with soft golden contrast',
    css: 'sepia(0.55) contrast(1.15) brightness(0.95) saturate(0.85)',
    color: '#f59e0b'
  },
  { 
    id: 'cinematic', 
    name: 'Cinematic', 
    description: 'Moody Hollywood blockbuster contrast and teal undertones',
    css: 'contrast(1.25) brightness(0.9) saturate(1.1) hue-rotate(-5deg)',
    color: '#06b6d4'
  },
  { 
    id: 'bw', 
    name: 'Black & White', 
    description: 'Timeless high-contrast monochrome with deep rich shadows',
    css: 'grayscale(1) contrast(1.3) brightness(0.95)',
    color: '#9ca3af'
  },
  { 
    id: 'warm', 
    name: 'Warm', 
    description: 'Golden hour amber radiance and sun-kissed warmth',
    css: 'sepia(0.3) saturate(1.4) brightness(1.05) contrast(1.05)',
    color: '#f97316'
  },
  { 
    id: 'cool', 
    name: 'Cool', 
    description: 'Frosty cyber cyan tones with clean calm aesthetics',
    css: 'hue-rotate(28deg) saturate(1.2) brightness(1.02) contrast(1.05)',
    color: '#3b82f6'
  },
  { 
    id: 'retro', 
    name: 'Retro', 
    description: 'Nostalgic 90s VHS vibe with neon chromatic shifts',
    css: 'sepia(0.35) hue-rotate(330deg) saturate(1.35) contrast(1.15)',
    color: '#ec4899'
  },
  { 
    id: 'glow', 
    name: 'Soft Glow', 
    description: 'Dreamy porcelain diffusion and highlight bloom',
    css: 'brightness(1.15) saturate(1.15) contrast(0.95)',
    color: '#a855f7'
  },
  { 
    id: 'bright', 
    name: 'Bright', 
    description: 'Luminous vivid clarity and boosted dynamics',
    css: 'brightness(1.25) contrast(1.08) saturate(1.2)',
    color: '#eab308'
  },
  { 
    id: 'dramatic', 
    name: 'Dramatic', 
    description: 'Deep theatrical shadows with intense vivid highlights',
    css: 'contrast(1.55) brightness(0.92) saturate(1.25)',
    color: '#ef4444'
  },
];

/**
 * Categorize MediaDevices DOMExceptions into actionable diagnosis & user instructions
 */
export function parseCameraError(err) {
  const errName = err?.name || '';
  const errMsg = err?.message || '';

  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    return {
      code: 'NOT_ALLOWED',
      title: 'Camera Permission Denied',
      message: 'Access to the camera was blocked by your browser or operating system.',
      troubleshooting: [
        'Click the camera or lock icon in your browser address bar.',
        'Change camera permission from "Block" to "Allow".',
        'On Windows: Check Settings > Privacy & Security > Camera and ensure desktop apps and your browser have access.',
        'On Mac: Check System Settings > Privacy & Security > Camera and allow your browser.',
        'Click "Try Again" below once permissions are granted.',
      ],
      icon: 'ShieldAlert',
    };
  }

  if (errName === 'NotReadableError' || errName === 'TrackStartError') {
    return {
      code: 'NOT_READABLE',
      title: 'Camera Currently In Use',
      message: 'Your camera is currently in use by another tab or application.',
      troubleshooting: [
        'Close other apps that use the webcam (Zoom, Microsoft Teams, Skype, Discord, OBS, FaceTime, etc.).',
        'Close any other browser tabs that currently have camera access open.',
        'If you recently closed a video call, wait 3-5 seconds for your operating system to release the hardware.',
        'If using an external USB webcam, disconnect and reconnect the USB cable.',
        'Click "Try Again" below to reconnect.',
      ],
      icon: 'VideoOff',
    };
  }

  if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
    return {
      code: 'NOT_FOUND',
      title: 'No Camera Detected',
      message: 'No video input hardware was detected on this system.',
      troubleshooting: [
        'Ensure your external webcam is securely plugged into your computer.',
        'Check that your laptop camera privacy shutter or physical toggle switch is open.',
        'Verify camera drivers in Windows Device Manager or macOS System Information.',
        'Click "Try Again" once your camera is connected.',
      ],
      icon: 'CameraOff',
    };
  }

  if (errName === 'OverconstrainedError') {
    return {
      code: 'OVERCONSTRAINED',
      title: 'Camera Configuration Unsupported',
      message: 'The requested resolution or lens mode is not supported by your camera hardware.',
      troubleshooting: [
        'SnapLens will automatically fall back to standard definition video.',
        'Click "Try Again" below to reinitialize with standard settings.',
      ],
      icon: 'Sliders',
    };
  }

  if (errName === 'SecurityError') {
    return {
      code: 'SECURITY',
      title: 'Insecure Origin / Security Block',
      message: 'Camera access is blocked because the page is not served over a secure origin.',
      troubleshooting: [
        'Modern browsers restrict camera APIs to secure HTTPS connections or localhost.',
        'Ensure you are browsing on https:// or http://localhost.',
      ],
      icon: 'Lock',
    };
  }

  if (errName === 'AbortError') {
    return {
      code: 'ABORTED',
      title: 'Camera Request Interrupted',
      message: 'The camera initialization request was aborted or interrupted.',
      troubleshooting: [
        'Click "Try Again" below to re-establish the connection.',
      ],
      icon: 'RefreshCw',
    };
  }

  return {
    code: 'UNKNOWN',
    title: 'Camera Unavailable',
    message: errMsg || 'Unable to open camera stream.',
    troubleshooting: [
      'Restart your web browser and try again.',
      'Check whether other web applications can access your camera.',
      'Click "Try Again" below to retry.',
    ],
    icon: 'AlertCircle',
  };
}

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Concurrency, StrictMode & Cleanup guards
  const isMountedRef = useRef(true);
  const isInitializingRef = useRef(false);
  const requestIdRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [mode, setMode] = useState('photo'); // 'photo' | 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [flash, setFlash] = useState(false); // torch
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  
  // Beauty adjustments
  const [beauty, setBeauty] = useState({
    smoothing: 0,    // blur in px (0 - 3px)
    brightness: 100, // % (60 - 140)
    contrast: 100,   // % (70 - 140)
    saturation: 100, // % (50 - 180)
  });

  // Calculate live composite CSS filter
  const getComputedFilterStyle = useCallback(() => {
    const filterParts = [];
    if (activeFilter.css && activeFilter.css !== 'none') {
      filterParts.push(activeFilter.css);
    }
    if (beauty.smoothing > 0) {
      filterParts.push(`blur(${beauty.smoothing}px)`);
    }
    if (beauty.brightness !== 100) {
      filterParts.push(`brightness(${beauty.brightness / 100})`);
    }
    if (beauty.contrast !== 100) {
      filterParts.push(`contrast(${beauty.contrast / 100})`);
    }
    if (beauty.saturation !== 100) {
      filterParts.push(`saturate(${beauty.saturation / 100})`);
    }
    return filterParts.length > 0 ? filterParts.join(' ') : 'none';
  }, [activeFilter, beauty]);

  // Clean up all tracks in current stream & release hardware handle
  const stopCamera = useCallback(() => {
    // Invalidate any in-flight request so it gets discarded immediately
    requestIdRef.current += 1;
    isInitializingRef.current = false;

    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping track:', e);
          }
        });
      } catch (e) {
        console.warn('Error reading stream tracks:', e);
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (e) {}
      videoRef.current.srcObject = null;
    }
  }, []);

  // Enumerate connected media devices
  const updateDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      return videoInputs;
    } catch {
      return [];
    }
  }, []);

  // Request camera and attach live preview stream with progressive fallback & hardware cooldown
  const startCamera = useCallback(async (targetFacing = facingMode) => {
    // Guard against simultaneous overlapping calls
    if (isInitializingRef.current) {
      console.warn('Camera initialization already in progress; ignoring duplicate trigger.');
      return;
    }

    isInitializingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails(null);

    // Stop existing camera stream and generate unique token for this invocation
    stopCamera();
    const currentRequestId = ++requestIdRef.current;

    // Hardware release cooldown (120ms) - essential on Windows/DirectShow
    // to give operating system drivers time to release the physical hardware lock
    await new Promise((resolve) => setTimeout(resolve, 120));

    // Abort if component unmounted or another startCamera was called during cooldown
    if (currentRequestId !== requestIdRef.current || !isMountedRef.current) {
      isInitializingRef.current = false;
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API is not supported in this browser.');
      }

      // Check for secure context
      if (
        typeof window !== 'undefined' &&
        window.isSecureContext === false &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        const secErr = new Error('Camera access requires a secure HTTPS context or localhost.');
        secErr.name = 'SecurityError';
        throw secErr;
      }

      let stream = null;
      let lastErr = null;

      // Strategy 1: Ideal HD video with requested facingMode & audio (if unmuted)
      try {
        const constraints = {
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: !isMuted,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        lastErr = err1;
        console.warn('Strategy 1 (HD + Audio) failed, evaluating fallback:', err1);

        // Strategy 2: If microphone was locked or resolution overconstrained, try Video-Only with ideal facingMode
        if (
          err1.name === 'NotReadableError' ||
          err1.name === 'TrackStartError' ||
          err1.name === 'OverconstrainedError' ||
          !isMuted
        ) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: targetFacing },
                width: { ideal: 1280, min: 480 },
                height: { ideal: 720, min: 360 },
              },
              audio: false,
            });
          } catch (err2) {
            lastErr = err2;
            console.warn('Strategy 2 (Standard Video-Only) failed:', err2);
          }
        }
      }

      // Strategy 3: Unconstrained resolution with facingMode, video only
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing },
            audio: false,
          });
        } catch (err3) {
          lastErr = err3;
          console.warn('Strategy 3 (Unconstrained facingMode) failed:', err3);
        }
      }

      // Strategy 4: Bare-minimum fallback to any available video input device (video: true)
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err4) {
          lastErr = err4;
          console.warn('Strategy 4 (Bare video: true) failed:', err4);
        }
      }

      // If all strategies failed, throw the most informative error
      if (!stream) {
        throw lastErr || new Error('Unable to connect to camera hardware.');
      }

      // Check if unmounted or if another startCamera was called while getUserMedia was pending!
      if (currentRequestId !== requestIdRef.current || !isMountedRef.current) {
        // Discard and immediately stop all tracks so it never locks the hardware!
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
        isInitializingRef.current = false;
        return;
      }

      streamRef.current = stream;

      // Attach stream to live video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video metadata to be loaded for smooth transition
        await new Promise((resolve) => {
          const video = videoRef.current;
          if (!video || video.readyState >= 2) {
            resolve();
            return;
          }
          const onLoaded = () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          };
          video.addEventListener('loadedmetadata', onLoaded);
          setTimeout(onLoaded, 600); // 600ms safety timeout
        });

        // Safely start playback
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.debug('Autoplay note (browser user interaction policy):', playErr);
        }
      }

      // Check capabilities of the active video track (zoom & torch)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.getCapabilities) {
        const capabilities = videoTrack.getCapabilities();
        if (capabilities.zoom) {
          setHasHardwareZoom(true);
          setMaxZoom(capabilities.zoom.max || 3);
        } else {
          setHasHardwareZoom(false);
        }

        if (capabilities.torch) {
          setHasTorchSupport(true);
        } else {
          setHasTorchSupport(false);
        }
      }

      // Update facing mode if reported by track settings
      if (videoTrack && videoTrack.getSettings) {
        const settings = videoTrack.getSettings();
        if (settings.facingMode) {
          setFacingMode(settings.facingMode);
        }
      }

      setHasPermission(true);
      setErrorMessage(null);
      setErrorDetails(null);
      setIsLoading(false);
      isInitializingRef.current = false;

      // Refresh list of available cameras
      await updateDeviceList();
    } catch (err) {
      console.error('Camera access error caught in useCamera:', err);

      // Clean up partially opened streams on failure
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch (e) {}
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsLoading(false);
      setHasPermission(false);
      isInitializingRef.current = false;

      // Classify error and set detailed troubleshooting instructions
      const parsed = parseCameraError(err);
      setErrorMessage(parsed.message);
      setErrorDetails(parsed);
    }
  }, [facingMode, isMuted, stopCamera, updateDeviceList]);

  // Switch between front and rear cameras safely
  const switchCamera = useCallback(async () => {
    if (isInitializingRef.current) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';

    // Stop current stream
    stopCamera();
    setFacingMode(nextFacing);

    // Give driver 150ms to release physical sensor before requesting next camera
    await new Promise((r) => setTimeout(r, 150));
    await startCamera(nextFacing);
  }, [facingMode, stopCamera, startCamera]);

  // Flash / Torch toggle
  const toggleFlash = useCallback(async () => {
    const nextFlash = !flash;
    setFlash(nextFlash);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const caps = track.getCapabilities();
        if (caps.torch) {
          try {
            await track.applyConstraints({
              advanced: [{ torch: nextFlash }],
            });
          } catch (err) {
            console.warn('Torch constraint error:', err);
          }
        }
      }
    }
  }, [flash]);

  // Zoom control
  const applyZoom = useCallback(async (newZoom) => {
    const clamped = Math.min(Math.max(1, newZoom), maxZoom);
    setZoomLevel(clamped);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const caps = track.getCapabilities();
        if (caps.zoom) {
          try {
            await track.applyConstraints({
              advanced: [{ zoom: clamped }],
            });
          } catch (err) {
            console.warn('Hardware zoom error:', err);
          }
        }
      }
    }
  }, [maxZoom]);

  // Capture still photo onto canvas from live video element
  const capturePhoto = useCallback((overlayDrawFn) => {
    if (!videoRef.current) return null;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Mirror horizontal when using selfie front camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Apply real-time filter effect
    const currentCssFilter = getComputedFilterStyle();
    if (currentCssFilter && currentCssFilter !== 'none') {
      ctx.filter = currentCssFilter;
    }

    // Apply digital zoom if hardware zoom was not active
    if (!hasHardwareZoom && zoomLevel > 1) {
      const cropW = width / zoomLevel;
      const cropH = height / zoomLevel;
      const cropX = (width - cropW) / 2;
      const cropY = (height - cropH) / 2;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, width, height);
    } else {
      ctx.drawImage(video, 0, 0, width, height);
    }

    // Reset transform and filter for AR lens stickers / overlays
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';

    if (typeof overlayDrawFn === 'function') {
      try {
        overlayDrawFn(ctx, width, height, facingMode);
      } catch (err) {
        console.warn('Overlay draw error during capture:', err);
      }
    }

    return canvas.toDataURL('image/jpeg', 0.96);
  }, [facingMode, getComputedFilterStyle, hasHardwareZoom, zoomLevel]);

  // Start recording video using MediaRecorder with optimized bitrate & broad codec compatibility
  const startRecording = useCallback((customStream = null) => {
    const streamToRecord = customStream || streamRef.current;
    if (!streamToRecord) return;
    recordedChunksRef.current = [];

    // Find best supported video MIME type in order of browser capability
    const candidateTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
      'video/webm',
    ];

    let chosenMime = '';
    for (const t of candidateTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        chosenMime = t;
        break;
      }
    }

    try {
      const options = {
        mimeType: chosenMime || undefined,
        videoBitsPerSecond: 2500000, // 2.5 Mbps - Crisp 1080p/720p without heavy file size bloat
        audioBitsPerSecond: 128000,  // 128 kbps stereo clarity
      };

      const recorder = new MediaRecorder(streamToRecord, options);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err) {
      console.warn('MediaRecorder with bitrates failed, trying standard fallback:', err);
      try {
        const fallbackRecorder = new MediaRecorder(streamToRecord);
        fallbackRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        fallbackRecorder.start(100);
        mediaRecorderRef.current = fallbackRecorder;
        setIsRecording(true);
        setRecordingSeconds(0);
      } catch (fallbackErr) {
        console.error('Failed to start MediaRecorder:', fallbackErr);
      }
    }
  }, []);

  // Stop recording video and resolve with ObjectURL & Blob
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const videoUrl = URL.createObjectURL(blob);
        setIsRecording(false);
        setRecordingSeconds(0);
        resolve({ blob, videoUrl, mimeType, size: blob.size });
      };

      try {
        recorder.stop();
      } catch (e) {
        setIsRecording(false);
        resolve(null);
      }
    });
  }, []);

  // Recording duration timer with auto-stop at 60s
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, stopRecording]);

  // Clean up camera hardware if user closes tab or refreshes
  useEffect(() => {
    const handleUnload = () => {
      stopCamera();
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [stopCamera]);

  // Initialize camera on mount & CLEAN UP streams when leaving camera page (StrictMode safe)
  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  return {
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
    maxZoom,
    beauty,
    setBeauty,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    startRecording,
    stopRecording,
    getComputedFilterStyle,
    filters: FILTERS,
  };
}
