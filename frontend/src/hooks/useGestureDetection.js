import { useCallback, useEffect, useRef, useState } from "react";

/**
 * MediaPipe Hands gesture detector.
 *
 * Returns the current gesture ("fist" | "palm" | "none") at ~15 FPS.
 *
 * Uses the CDN-hosted WASM/model files to avoid bundling 10 MB+ of binaries.
 * The hook attaches to a provided <video> element ref so callers control the
 * camera lifecycle (start / stop) externally.
 *
 * @param {{ videoRef: React.RefObject<HTMLVideoElement>, enabled: boolean }} opts
 * @returns {{ gesture: string, confidence: number, isReady: boolean, error: string|null, startCamera: () => void, stopCamera: () => void }}
 */
export default function useGestureDetection({ videoRef, enabled = false }) {
  const [gesture, setGesture] = useState("none");
  const [confidence, setConfidence] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const handsRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const lastGestureRef = useRef("none");
  const gestureStableCountRef = useRef(0);

  // Minimum consecutive identical frames before we commit a gesture change
  const STABLE_THRESHOLD = 3;

  /**
   * Classify hand landmarks into "fist" or "palm".
   *
   * Fist  → every fingertip y-coordinate is BELOW its MCP (knuckle) joint.
   * Palm  → every fingertip y-coordinate is ABOVE its MCP joint.
   *
   * Uses MediaPipe landmark indices:
   *   Finger tips:  4, 8, 12, 16, 20
   *   MCP joints:   2, 5,  9, 13, 17  (proximal base for thumb)
   */
  const classifyGesture = useCallback((landmarks) => {
    if (!landmarks || landmarks.length === 0)
      return { gesture: "none", confidence: 0 };

    const hand = landmarks[0]; // Use the first detected hand
    const tipIds = [4, 8, 12, 16, 20];
    const mcpIds = [2, 5, 9, 13, 17];

    let fingersOpen = 0;
    let fingersClosed = 0;

    for (let i = 0; i < tipIds.length; i++) {
      const tip = hand[tipIds[i]];
      const mcp = hand[mcpIds[i]];

      if (i === 0) {
        // Thumb – use x-axis distance from mcp
        const thumbOpen = Math.abs(tip.x - mcp.x) > 0.05;
        if (thumbOpen) fingersOpen++;
        else fingersClosed++;
      } else {
        // Other fingers – tip above mcp means open (smaller y = higher on screen)
        if (tip.y < mcp.y - 0.02) fingersOpen++;
        else fingersClosed++;
      }
    }

    if (fingersClosed >= 4)
      return { gesture: "fist", confidence: fingersClosed / 5 };
    if (fingersOpen >= 4)
      return { gesture: "palm", confidence: fingersOpen / 5 };
    return { gesture: "none", confidence: 0 };
  }, []);

  /**
   * Start the webcam stream and attach it to the video element.
   */
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) return; // already running
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 320,
          height: 240,
          facingMode: "user",
          frameRate: { ideal: 15 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera start failed:", err);
      setError("Camera access denied. Please allow camera permission.");
    }
  }, [videoRef]);

  /**
   * Stop the webcam stream and clean up tracks.
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [videoRef]);

  // ── Initialise MediaPipe Hands via CDN ──────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const init = async () => {
      try {
        // Dynamic import so tree-shaking works when the hook is not used
        const { Hands } = await import("@mediapipe/hands");

        if (cancelled) return;

        const hands = new Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0, // 0 = lite – faster on low-end GPUs
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          const { gesture: g, confidence: c } = classifyGesture(
            results.multiHandLandmarks,
          );

          // Stabiliser: require N consecutive identical frames
          if (g === lastGestureRef.current) {
            gestureStableCountRef.current++;
          } else {
            gestureStableCountRef.current = 1;
            lastGestureRef.current = g;
          }

          if (gestureStableCountRef.current >= STABLE_THRESHOLD) {
            setGesture(g);
            setConfidence(c);
          }
        });

        await hands.initialize();
        if (cancelled) return;

        handsRef.current = hands;
        setIsReady(true);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          console.error("MediaPipe init error:", err);
          setError("Failed to initialise hand tracking.");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [enabled, classifyGesture]);

  // ── Frame loop: send video frames to MediaPipe at ~15 FPS ───────
  useEffect(() => {
    if (!enabled || !isReady || !handsRef.current) return;

    // We draw to an offscreen canvas because MediaPipe.send() expects an
    // HTMLCanvasElement or HTMLVideoElement
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = 320;
      canvasRef.current.height = 240;
    }

    const FRAME_INTERVAL = 1000 / 15; // ~15 FPS
    let lastTime = 0;
    let running = true;

    const loop = async (ts) => {
      if (!running) return;

      if (ts - lastTime >= FRAME_INTERVAL) {
        lastTime = ts;
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          try {
            await handsRef.current.send({ image: video });
          } catch {
            // Silently ignore send errors (e.g. model not ready yet)
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, isReady, videoRef]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
      if (handsRef.current) {
        handsRef.current.close?.();
        handsRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stopCamera]);

  return { gesture, confidence, isReady, error, startCamera, stopCamera };
}
