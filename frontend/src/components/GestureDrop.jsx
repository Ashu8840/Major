import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTransfer } from "../context/TransferContext";
import useGestureDetection from "../hooks/useGestureDetection";

/**
 * GestureDrop – invisible component that runs the camera in the background
 * on the Community page when a transfer session is active ("isHolding").
 *
 * When the user shows a **fist ✊** gesture, it consumes the session,
 * downloads the image as a File, and calls `onImageReady(file, previewUrl)`
 * so the parent can open the existing "Start a Post → Photo" composer
 * with the image pre-loaded.
 *
 * The camera video element is rendered off-screen (invisible) so the user
 * sees no camera window on the Community page.
 */
export default function GestureDrop({ onImageReady }) {
  const { isHolding, dropImage } = useTransfer();

  const [cameraActive, setCameraActive] = useState(false);
  const [hasDropped, setHasDropped] = useState(false);
  const videoRef = useRef(null);
  const dropLockRef = useRef(false);

  const { gesture, isReady, startCamera, stopCamera } = useGestureDetection({
    videoRef,
    enabled: cameraActive && isHolding && !hasDropped,
  });

  // ── Auto-start camera (hidden) when holding session detected ─────
  useEffect(() => {
    if (isHolding && !cameraActive && !hasDropped) {
      setCameraActive(true);
      startCamera();
    }
  }, [isHolding, cameraActive, hasDropped, startCamera]);

  // ── Stop camera when no longer holding ───────────────────────────
  useEffect(() => {
    if (!isHolding && cameraActive) {
      stopCamera();
      setCameraActive(false);
    }
  }, [isHolding, cameraActive, stopCamera]);

  // ── Fist gesture → consume session & open composer ───────────────
  useEffect(() => {
    if (gesture !== "fist" || !isHolding || hasDropped || dropLockRef.current)
      return;

    dropLockRef.current = true;

    (async () => {
      try {
        const result = await dropImage();
        if (result) {
          setHasDropped(true);
          stopCamera();
          setCameraActive(false);

          // Pass the Cloudinary URL directly — NO re-download or re-encode.
          // This preserves the original upload quality end-to-end.
          toast.success("Image received! Composer opened.");
          onImageReady?.(result.imageUrl, result.fileName, result.mimeType);
        }
      } catch {
        toast.error("Drop failed.");
      } finally {
        dropLockRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesture]);

  // Reset when transfer changes
  useEffect(() => {
    if (!isHolding && !hasDropped) {
      dropLockRef.current = false;
      setHasDropped(false);
    }
  }, [isHolding, hasDropped]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ── Hidden video element (off-screen, needed for MediaPipe) ──────
  // We render the video element but make it invisible. MediaPipe needs
  // a real <video> element with a camera stream to process frames.
  return (
    <video
      ref={videoRef}
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
      playsInline
      muted
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
