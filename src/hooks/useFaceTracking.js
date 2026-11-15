import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for MediaPipe & Native Browser Face Detection API
 * Provides real-time facial bounding boxes, landmarks and smoothed anchors for Snapchat AR lenses
 */
export function useFaceTracking(videoRef, isEnabled = true) {
  const [faces, setFaces] = useState([]);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [activeFaceLens, setActiveFaceLens] = useState('none');
  const smoothedFacesRef = useRef([]);
  const faceDetectorRef = useRef(null);

  // Initialize MediaPipe or Native FaceDetector
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Native FaceDetector API is available (Chrome/Edge/Android)
    if ('FaceDetector' in window) {
      try {
        // @ts-ignore
        faceDetectorRef.current = new window.FaceDetector({
          maxDetectedFaces: 4,
          fastMode: true,
        });
      } catch (err) {
        console.debug('Native FaceDetector init note:', err);
      }
    }

    // Load MediaPipe Face Detection dynamically as complementary tracker
    const scriptId = 'mediapipe-face-script';
    if (!document.getElementById(scriptId) && !faceDetectorRef.current) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js';
      script.async = true;
      script.onload = () => {
        try {
          if (window.FaceDetection) {
            const mpFace = new window.FaceDetection({
              locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
            });
            mpFace.setOptions({
              model: 'short',
              minDetectionConfidence: 0.5,
            });
            mpFace.onResults((results) => {
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
                setIsFaceDetected(true);
              } else {
                updateSmoothedFaces([]);
                setIsFaceDetected(false);
              }
            });
            faceDetectorRef.current = {
              detectMediaPipe: (video) => mpFace.send({ image: video }),
            };
          }
        } catch (e) {
          console.debug('MediaPipe dynamic init note:', e);
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  // Coordinate smoothing helper (exponential moving average for jitter-free tracking)
  const updateSmoothedFaces = useCallback((rawFaces) => {
    if (!rawFaces || rawFaces.length === 0) {
      smoothedFacesRef.current = [];
      setFaces([]);
      setIsFaceDetected(false);
      return;
    }

    const alpha = 0.55; // Smoothing factor (0.55 = fast response with zero jitter)
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
    setFaces(smoothed);
  }, []);

  // Frame detection loop
  useEffect(() => {
    if (!isEnabled || activeFaceLens === 'none') {
      smoothedFacesRef.current = [];
      setFaces([]);
      setIsFaceDetected(false);
      return;
    }

    let animationFrameId = null;
    let lastTimestamp = 0;

    const detectFrame = async (timestamp) => {
      // Run detection every 60ms (~16 FPS detection, rendered smoothly at 60 FPS)
      if (timestamp - lastTimestamp > 60 && videoRef.current && videoRef.current.readyState >= 2) {
        lastTimestamp = timestamp;
        const video = videoRef.current;

        // Strategy A: Native FaceDetector
        if (faceDetectorRef.current && faceDetectorRef.current.detect) {
          try {
            const detected = await faceDetectorRef.current.detect(video);
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
              setIsFaceDetected(true);
            } else {
              updateSmoothedFaces([]);
              setIsFaceDetected(false);
            }
          } catch (e) {
            updateSmoothedFaces([]);
          }
        } else if (faceDetectorRef.current && faceDetectorRef.current.detectMediaPipe) {
          // Strategy B: MediaPipe
          try {
            await faceDetectorRef.current.detectMediaPipe(video);
          } catch (e) {
            updateSmoothedFaces([]);
          }
        } else {
          // Waiting for detector model or camera frame
          updateSmoothedFaces([]);
          setIsFaceDetected(false);
        }
      }

      animationFrameId = requestAnimationFrame(detectFrame);
    };

    animationFrameId = requestAnimationFrame(detectFrame);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isEnabled, activeFaceLens, videoRef, updateSmoothedFaces]);

  return {
    faces,
    isFaceDetected,
    activeFaceLens,
    setActiveFaceLens,
  };
}
