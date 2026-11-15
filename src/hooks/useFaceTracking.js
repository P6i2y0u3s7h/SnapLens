import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Global Singleton for Face Detectors (Native Browser API & MediaPipe)
 * Initialized once across the entire application lifecycle.
 * Models are never reloaded when switching filters or navigating.
 */
let globalDetectorInstance = null;
let globalInitPromise = null;

function getOrInitFaceDetector(onMediaPipeResults) {
  if (globalDetectorInstance) {
    return Promise.resolve(globalDetectorInstance);
  }

  if (globalInitPromise) {
    return globalInitPromise;
  }

  globalInitPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    // 1. Try Native Hardware-Accelerated FaceDetector API (Chrome/Edge/Android)
    if ('FaceDetector' in window) {
      try {
        // @ts-ignore
        const nativeDetector = new window.FaceDetector({
          maxDetectedFaces: 2,
          fastMode: true,
        });
        globalDetectorInstance = {
          type: 'native',
          detect: (video) => nativeDetector.detect(video),
        };
        resolve(globalDetectorInstance);
        return;
      } catch (err) {
        console.debug('Native FaceDetector fallback to MediaPipe:', err);
      }
    }

    // 2. Load MediaPipe Face Detection as complementary GPU/WASM tracker
    const scriptId = 'mediapipe-face-script';
    let script = document.getElementById(scriptId);

    const onScriptLoaded = () => {
      try {
        if (window.FaceDetection) {
          const mpFace = new window.FaceDetection({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
          });
          mpFace.setOptions({
            model: 'short',
            minDetectionConfidence: 0.5,
          });

          globalDetectorInstance = {
            type: 'mediapipe',
            mpFace,
            detect: async (video) => {
              await mpFace.send({ image: video });
            },
          };
          resolve(globalDetectorInstance);
        } else {
          resolve(null);
        }
      } catch (e) {
        console.debug('MediaPipe init note:', e);
        resolve(null);
      }
    };

    if (window.FaceDetection) {
      onScriptLoaded();
    } else if (script) {
      script.addEventListener('load', onScriptLoaded, { once: true });
    } else {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js';
      script.async = true;
      script.onload = onScriptLoaded;
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    }
  });

  return globalInitPromise;
}

/**
 * High-Performance AR Face Tracking Hook
 * - Zero React re-renders during active tracking (tracked data stored in mutable refs)
 * - Continuous background detection: switching filters is instant (<16ms)
 * - Concurrency locked: prevents frame queuing and browser freezes
 * - Smooth exponential moving average for jitter-free visual stability
 */
export function useFaceTracking(videoRef, isEnabled = true) {
  // Boolean state for UI badges only (only triggers React render on status change)
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const isFaceDetectedRef = useRef(false);

  // Active filter state and synchronously-readable ref for canvas render loop
  const [activeFaceLens, setActiveFaceLensState] = useState('none');
  const activeFaceLensRef = useRef('none');

  // Face coordinate storage: live ref for 60 FPS canvas loop
  const facesRef = useRef([]);
  const smoothedFacesRef = useRef([]);

  // Concurrency lock: prevents overlapping async MediaPipe detections
  const isDetectingRef = useRef(false);
  const detectorInstanceRef = useRef(null);

  // Synchronous filter updater
  const setActiveFaceLens = useCallback((lensId) => {
    activeFaceLensRef.current = lensId;
    setActiveFaceLensState(lensId);
  }, []);

  // Coordinate smoothing helper (exponential moving average: fast response, 0 jitter)
  const updateSmoothedFaces = useCallback((rawFaces) => {
    if (!rawFaces || rawFaces.length === 0) {
      smoothedFacesRef.current = [];
      facesRef.current = [];
      if (isFaceDetectedRef.current !== false) {
        isFaceDetectedRef.current = false;
        setIsFaceDetected(false);
      }
      return;
    }

    const alpha = 0.55; // 0.55 optimal smoothing factor
    const prev = smoothedFacesRef.current;

    const smoothed = rawFaces.map((f, i) => {
      const p = prev[i];
      if (!p) return f;
      return {
        x: p.x + alpha * (f.x - p.x),
        y: p.y + alpha * (f.y - p.y),
        width: p.width + alpha * (f.width - p.width),
        height: p.height + alpha * (f.height - p.height),
      };
    });

    smoothedFacesRef.current = smoothed;
    facesRef.current = smoothed;

    if (isFaceDetectedRef.current !== true) {
      isFaceDetectedRef.current = true;
      setIsFaceDetected(true);
    }
  }, []);

  // Initialize Detector once
  useEffect(() => {
    let isMounted = true;

    getOrInitFaceDetector().then((detector) => {
      if (!isMounted || !detector) return;
      detectorInstanceRef.current = detector;

      // If MediaPipe is used, connect results callback
      if (detector.type === 'mediapipe' && detector.mpFace) {
        detector.mpFace.onResults((results) => {
          if (!isMounted) return;
          if (results.detections && results.detections.length > 0) {
            const detected = results.detections.map((d) => {
              const bb = d.boundingBox;
              return {
                x: bb.xCenter - bb.width / 2,
                y: bb.yCenter - bb.height / 2,
                width: bb.width,
                height: bb.height,
              };
            });
            updateSmoothedFaces(detected);
          } else {
            updateSmoothedFaces([]);
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [updateSmoothedFaces]);

  // Continuous frame detection loop (runs continuously when enabled without restarting on filter switches)
  useEffect(() => {
    if (!isEnabled) {
      smoothedFacesRef.current = [];
      facesRef.current = [];
      if (isFaceDetectedRef.current !== false) {
        isFaceDetectedRef.current = false;
        setIsFaceDetected(false);
      }
      return;
    }

    let animationFrameId = null;
    let lastDetectionTime = 0;
    const DETECTION_INTERVAL_MS = 50; // ~20 FPS detection: lightweight on CPU/GPU, rendered at 60 FPS

    const detectFrame = async (timestamp) => {
      // Throttle detection frequency and ensure previous detection has finished
      if (
        timestamp - lastDetectionTime >= DETECTION_INTERVAL_MS &&
        !isDetectingRef.current &&
        videoRef.current &&
        videoRef.current.readyState >= 2
      ) {
        lastDetectionTime = timestamp;
        const video = videoRef.current;
        const detector = detectorInstanceRef.current;

        if (detector) {
          isDetectingRef.current = true;
          try {
            if (detector.type === 'native') {
              const detected = await detector.detect(video);
              if (detected && detected.length > 0) {
                const videoW = video.videoWidth || 1;
                const videoH = video.videoHeight || 1;
                const normalized = detected.map((f) => ({
                  x: f.boundingBox.x / videoW,
                  y: f.boundingBox.y / videoH,
                  width: f.boundingBox.width / videoW,
                  height: f.boundingBox.height / videoH,
                }));
                updateSmoothedFaces(normalized);
              } else {
                updateSmoothedFaces([]);
              }
            } else if (detector.type === 'mediapipe') {
              await detector.detect(video);
            }
          } catch (e) {
            // Ignore frame capture drops during camera transitions
          } finally {
            isDetectingRef.current = false;
          }
        }
      }

      animationFrameId = requestAnimationFrame(detectFrame);
    };

    animationFrameId = requestAnimationFrame(detectFrame);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isEnabled, videoRef, updateSmoothedFaces]);

  return {
    faces: facesRef.current, // Backwards-compatible
    facesRef,                // Direct ref for 60 FPS canvas loop
    getFaces: () => facesRef.current,
    isFaceDetected,
    activeFaceLens,
    activeFaceLensRef,       // Direct ref for instantaneous lens switching
    setActiveFaceLens,
  };
}
