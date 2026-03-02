import { useCallback, useEffect, useRef, useState } from "react";
import {
  IoClose,
  IoCamera,
  IoImage,
  IoHandRight,
  IoCloudUpload,
  IoCheckmarkCircle,
  IoWarning,
  IoRefresh,
  IoTime,
} from "react-icons/io5";
import toast from "react-hot-toast";
import { useTransfer } from "../context/TransferContext";
import useGestureDetection from "../hooks/useGestureDetection";

/**
 * GrabSidebar – right-hand drawer for the "Grab & Drop" image transfer feature.
 *
 * Steps:
 *   1. User selects/captures an image.
 *   2. Camera starts, MediaPipe tracks hand gestures.
 *   3. On fist → grabImage() is called, a transfer session is created.
 *   4. A floating preview shows the held image.
 *
 * The sidebar name in navigation is "AirGrab".
 */
export default function GrabSidebar({ isOpen, onClose }) {
  const { grabImage, isHolding, holdingImage, activeSession, cancelTransfer } =
    useTransfer();

  // ── Image selection ─────────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState(null); // { file, previewUrl }
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // ── Gesture detection ───────────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const {
    gesture,
    isReady,
    error: gestureError,
    startCamera,
    stopCamera,
  } = useGestureDetection({
    videoRef,
    enabled: cameraActive && !isHolding,
  });

  // ── Timer for session countdown ──────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!activeSession?.expiresAt) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const ms = new Date(activeSession.expiresAt).getTime() - Date.now();
      setTimeLeft(ms > 0 ? Math.ceil(ms / 1000) : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession?.expiresAt]);

  // ── File selection handler ──────────────────────────────────────
  const onFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB.");
      return;
    }
    setSelectedImage({ file, previewUrl: URL.createObjectURL(file) });
    setUploadedUrl(null);
  }, []);

  // ── Upload image to cloudinary via existing upload endpoint ─────
  const uploadImage = useCallback(async () => {
    if (!selectedImage?.file) return null;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("media", selectedImage.file);

      // Use the existing upload endpoint
      const { default: api } = await import("../utils/api");
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = data.url || data.imageUrl || data.secure_url;
      setUploadedUrl(url);
      return url;
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Image upload failed. Try again.");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [selectedImage]);

  // ── Fist gesture → grab ─────────────────────────────────────────
  useEffect(() => {
    if (gesture !== "fist" || !selectedImage || isHolding) return;

    (async () => {
      try {
        let url = uploadedUrl;
        if (!url) {
          url = await uploadImage();
        }
        if (!url) return;

        await grabImage({
          imageUrl: url,
          thumbnailUrl: url,
          fileName: selectedImage.file.name,
          mimeType: selectedImage.file.type,
        });

        toast.success(
          "Image grabbed! Open /community on another device and show your palm.",
        );
        stopCamera();
        setCameraActive(false);
      } catch {
        toast.error("Failed to grab image.");
      }
    })();
    // Only trigger when gesture transitions to fist
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesture]);

  // ── Auto-start camera when sidebar opens ────────────────────────
  useEffect(() => {
    if (isOpen && !isHolding) {
      setCameraActive(true);
      startCamera();
    } else if (!isOpen) {
      stopCamera();
      setCameraActive(false);
    }
  }, [isOpen, isHolding, startCamera, stopCamera]);

  // ── Reset everything ────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (selectedImage?.previewUrl)
      URL.revokeObjectURL(selectedImage.previewUrl);
    setSelectedImage(null);
    setUploadedUrl(null);
    stopCamera();
    setCameraActive(false);
  }, [selectedImage, stopCamera]);

  const handleCancel = useCallback(async () => {
    await cancelTransfer();
    handleReset();
    toast("Transfer cancelled.");
  }, [cancelTransfer, handleReset]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-sm flex-col bg-theme-surface shadow-2xl border-l border-theme sm:max-w-md"
        role="dialog"
        aria-label="AirGrab – Gesture Image Transfer"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
              <IoHandRight className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-theme-primary">
                AirGrab
              </h2>
              <p className="text-xs text-theme-secondary">Gesture transfer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-theme-primary-soft text-theme-primary hover:opacity-80 transition"
            aria-label="Close"
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* ── Step 1: Select Image ─────────────────────────── */}
          {!isHolding && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-theme-primary flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xs font-bold dark:bg-violet-900 dark:text-violet-300">
                  1
                </span>
                Select an Image
              </h3>

              {selectedImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-theme shadow-md">
                  <img
                    src={selectedImage.previewUrl}
                    alt="Selected"
                    className="w-full max-h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleReset}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                    aria-label="Remove image"
                  >
                    <IoClose className="h-4 w-4" />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-theme p-6 text-theme-secondary hover:border-violet-400 hover:text-violet-500 transition"
                  >
                    <IoImage className="h-8 w-8" />
                    <span className="text-xs font-medium">From Files</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-theme p-6 text-theme-secondary hover:border-violet-400 hover:text-violet-500 transition"
                  >
                    <IoCamera className="h-8 w-8" />
                    <span className="text-xs font-medium">Take Photo</span>
                  </button>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onFileChange}
              />
            </section>
          )}

          {/* ── Camera Preview (always visible when not holding) ── */}
          {!isHolding && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-theme-primary flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xs font-bold dark:bg-violet-900 dark:text-violet-300">
                  {selectedImage ? "2" : "📷"}
                </span>
                {selectedImage ? "Make a Fist to Grab" : "Camera"}
              </h3>

              <div className="relative rounded-2xl overflow-hidden border border-theme bg-black">
                <video
                  ref={videoRef}
                  className="w-full aspect-video object-cover"
                  playsInline
                  muted
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Gesture badge */}
                {cameraActive && isReady && (
                  <div
                    className={`absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-lg ${
                      gesture === "fist"
                        ? "bg-green-500 text-white"
                        : gesture === "palm"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700 text-gray-200"
                    }`}
                  >
                    <IoHandRight className="h-3.5 w-3.5" />
                    {gesture === "fist"
                      ? "Fist detected!"
                      : gesture === "palm"
                        ? "Palm detected"
                        : selectedImage
                          ? "Show fist ✊"
                          : "Select image first"}
                  </div>
                )}
              </div>

              {gestureError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-2 text-xs text-red-600 dark:text-red-300">
                  <IoWarning className="h-4 w-4 flex-shrink-0" />
                  {gestureError}
                </div>
              )}

              {cameraActive && !isReady && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <div className="h-3 w-3 animate-spin rounded-full border border-amber-500 border-t-transparent" />
                  Loading hand-tracking model…
                </div>
              )}

              <div className="rounded-xl bg-theme-primary-soft p-3">
                <p className="text-xs text-theme-secondary leading-relaxed">
                  <strong>How it works:</strong> Select an image above, then
                  show a{" "}
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    closed fist ✊
                  </span>{" "}
                  to grab it. Then go to{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Community
                  </span>{" "}
                  and show an{" "}
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    open palm 🖐
                  </span>{" "}
                  to drop it into the upload modal.
                </p>
              </div>
            </section>
          )}

          {/* ── Holding State ────────────────────────────────── */}
          {isHolding && holdingImage && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/30 px-4 py-3">
                <IoCheckmarkCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    Image Grabbed!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Open /community on another device and show your palm.
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="relative overflow-hidden rounded-2xl border border-green-200 dark:border-green-800 shadow-lg">
                <img
                  src={holdingImage.thumbnailUrl || holdingImage.imageUrl}
                  alt="Holding"
                  className="w-full max-h-56 object-cover"
                />
                {/* Floating pulse ring */}
                <div className="absolute inset-0 rounded-2xl border-2 border-green-400 animate-pulse pointer-events-none" />
              </div>

              {/* Countdown timer */}
              {timeLeft !== null && (
                <div className="flex items-center gap-2 rounded-xl bg-theme-primary-soft px-4 py-2">
                  <IoTime className="h-4 w-4 text-theme-secondary" />
                  <span className="text-xs text-theme-secondary">
                    Expires in{" "}
                    <span className="font-bold text-theme-primary">
                      {Math.floor(timeLeft / 60)}:
                      {String(timeLeft % 60).padStart(2, "0")}
                    </span>
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-2 rounded-xl border border-theme bg-theme-surface px-4 py-3 text-sm font-semibold text-theme-primary hover:opacity-80 transition"
                >
                  <IoClose className="h-4 w-4" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition"
                >
                  <IoRefresh className="h-4 w-4" /> New Grab
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-theme px-5 py-3">
          <p className="text-[10px] text-theme-secondary text-center leading-relaxed">
            Cross-device gesture transfer &bull; Images expire in 5 min &bull;
            Same account only
          </p>
        </div>
      </aside>

      {/* ── Floating "Holding" badge (always visible when holding) ── */}
      {isHolding && holdingImage && !isOpen && (
        <button
          type="button"
          onClick={onClose} // re-open the sidebar
          className="fixed bottom-24 right-6 z-50 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-3 text-white shadow-2xl animate-bounce hover:shadow-3xl transition sm:bottom-8"
          aria-label="Holding image – tap to view"
        >
          <img
            src={holdingImage.thumbnailUrl || holdingImage.imageUrl}
            alt=""
            className="h-10 w-10 rounded-lg object-cover ring-2 ring-white/30"
          />
          <div className="text-left">
            <p className="text-xs font-bold">Holding image</p>
            <p className="text-[10px] opacity-80">Show palm on laptop</p>
          </div>
        </button>
      )}
    </>
  );
}
