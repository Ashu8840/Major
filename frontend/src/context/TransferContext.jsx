import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "../utils/api";
import api from "../utils/api";
import { AuthContext } from "./AuthContext";

/**
 * TransferContext – manages the cross-device gesture-based image transfer lifecycle.
 *
 * Provides:
 *   holdingImage        – the image data being "held" after a fist grab
 *   activeSession       – the current TransferSession metadata (sessionId, expiresAt, …)
 *   isHolding           – convenience boolean for UI gating
 *   grabImage(payload)  – called on Device A when a fist is detected
 *   dropImage()         – called on Device B when a palm is detected
 *   cancelTransfer()    – called when user manually cancels
 *   clearTransfer()     – silently clear local state (e.g. after consumption)
 *   socket              – the shared Socket.IO instance (other components may need it)
 */
const TransferContext = createContext(null);

export function TransferProvider({ children }) {
  const { token, user } = useContext(AuthContext);
  const userId = user?.id;

  const [holdingImage, setHoldingImage] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const socketRef = useRef(null);
  const expiryTimerRef = useRef(null);

  // ── Socket.IO lifecycle ──────────────────────────────────────────
  useEffect(() => {
    if (!token || !userId) {
      // Not logged in → disconnect & reset
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setHoldingImage(null);
      setActiveSession(null);
      return;
    }

    // Create a persistent Socket.IO connection scoped to the user
    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      // Register so the server puts us in the userId room
      socket.emit("user:register", userId);
    });

    // ── Transfer events from other devices ─────────────────────────
    socket.on("transfer:created", (data) => {
      // Another device (or our own REST call echo) created a grab session
      setActiveSession(data);
      setHoldingImage({
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        fileName: data.fileName,
        mimeType: data.mimeType,
      });
      scheduleExpiry(data.expiresAt);
    });

    socket.on("transfer:accepted", (data) => {
      // Transfer was consumed on another device → clear holding state
      setActiveSession(null);
      setHoldingImage(null);
      clearExpiry();
    });

    socket.on("transfer:cancelled", () => {
      setActiveSession(null);
      setHoldingImage(null);
      clearExpiry();
    });

    socket.on("disconnect", () => {
      // Session invalidated on disconnect
      setActiveSession(null);
      setHoldingImage(null);
      clearExpiry();
    });

    socketRef.current = socket;

    // On mount, check if a session already existed (page refresh / second tab)
    (async () => {
      try {
        const { data } = await api.get("/transfer/active");
        if (data.session) {
          setActiveSession(data.session);
          setHoldingImage({
            imageUrl: data.session.imageUrl,
            thumbnailUrl: data.session.thumbnailUrl,
            fileName: data.session.fileName,
            mimeType: data.session.mimeType,
          });
          scheduleExpiry(data.session.expiresAt);
        }
      } catch {
        // Silent – no active session
      }
    })();

    return () => {
      socket.disconnect();
      socketRef.current = null;
      clearExpiry();
    };
    // userId and token are the only true deps – intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token]);

  // ── Expiry helpers ──────────────────────────────────────────────
  const clearExpiry = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const scheduleExpiry = useCallback(
    (expiresAt) => {
      clearExpiry();
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setActiveSession(null);
        setHoldingImage(null);
        return;
      }
      expiryTimerRef.current = setTimeout(() => {
        setActiveSession(null);
        setHoldingImage(null);
      }, ms);
    },
    [clearExpiry],
  );

  // ── Public actions ──────────────────────────────────────────────

  /**
   * Grab: called on Device A when a fist gesture is detected.
   * @param {{ imageUrl: string, thumbnailUrl?: string, fileName?: string, mimeType?: string }} payload
   */
  const grabImage = useCallback(
    async (payload) => {
      try {
        const { data } = await api.post("/transfer/create", payload);

        setActiveSession(data);
        setHoldingImage({
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl,
          fileName: data.fileName,
          mimeType: data.mimeType,
        });
        scheduleExpiry(data.expiresAt);

        // Also tell the socket room (for devices already connected)
        socketRef.current?.emit("transfer:grab", data);
      } catch (err) {
        console.error("grabImage failed:", err);
        throw err;
      }
    },
    [scheduleExpiry],
  );

  /**
   * Drop: called on Device B when a palm gesture is detected on /community.
   * Returns the image metadata so the caller can prefill the upload modal.
   */
  const dropImage = useCallback(async () => {
    if (!activeSession) return null;

    try {
      const { data } = await api.post("/transfer/accept", {
        sessionId: activeSession.sessionId,
      });

      const result = {
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        fileName: data.fileName,
        mimeType: data.mimeType,
      };

      socketRef.current?.emit("transfer:drop", {
        sessionId: activeSession.sessionId,
      });

      setActiveSession(null);
      setHoldingImage(null);
      clearExpiry();

      return result;
    } catch (err) {
      console.error("dropImage failed:", err);
      return null;
    }
  }, [activeSession, clearExpiry]);

  /**
   * Cancel: user manually cancels the grab.
   */
  const cancelTransfer = useCallback(async () => {
    try {
      await api.delete("/transfer/cancel");
      socketRef.current?.emit("transfer:cancel");
    } catch {
      // Silent
    }
    setActiveSession(null);
    setHoldingImage(null);
    clearExpiry();
  }, [clearExpiry]);

  /**
   * Clear: reset local state only (no server call).
   */
  const clearTransfer = useCallback(() => {
    setActiveSession(null);
    setHoldingImage(null);
    clearExpiry();
  }, [clearExpiry]);

  const isHolding = Boolean(activeSession && holdingImage);

  const value = useMemo(
    () => ({
      holdingImage,
      activeSession,
      isHolding,
      grabImage,
      dropImage,
      cancelTransfer,
      clearTransfer,
      socket: socketRef.current,
    }),
    [
      holdingImage,
      activeSession,
      isHolding,
      grabImage,
      dropImage,
      cancelTransfer,
      clearTransfer,
    ],
  );

  return (
    <TransferContext.Provider value={value}>
      {children}
    </TransferContext.Provider>
  );
}

export const useTransfer = () => {
  const ctx = useContext(TransferContext);
  if (!ctx) throw new Error("useTransfer must be used within TransferProvider");
  return ctx;
};

export default TransferContext;
