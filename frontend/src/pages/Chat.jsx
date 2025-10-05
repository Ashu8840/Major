import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import ChatList from "../components/ChatList";
import ChatHeader from "../components/ChatHeader";
import ChatWindow from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import {
  getChatList,
  getChatMessages,
  sendChatMessage,
  clearChat,
  blockChatUser,
  unblockChatUser,
  deleteChatForUser,
  SOCKET_BASE_URL,
} from "../utils/api";

const SOCKET_URL = SOCKET_BASE_URL;

const detectMediaKind = (mimeType = "") => {
  if (!mimeType) return "document";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

const formatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 30 * 1000) return "Now";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const buildMessagePreview = (message) => {
  if (!message) return "Start the conversation";
  if (message.callType) {
    const typeLabel = message.callType === "video" ? "Video" : "Voice";
    const status = message.callStatus === "missed" ? "Missed" : "Completed";
    return `${status} ${typeLabel.toLowerCase()} call`;
  }

  if (Array.isArray(message.media) && message.media.length > 0) {
    const media = message.media[0];
    if (media.type === "image") return "📷 Photo";
    if (media.type === "video") return "🎬 Video";
    if (media.type === "audio") return "🎙️ Voice note";
    return "📎 Attachment";
  }

  if (message.mediaType) {
    if (message.mediaType === "image") return "📷 Photo";
    if (message.mediaType === "video") return "🎬 Video";
    if (message.mediaType === "audio") return "🎙️ Voice note";
    return "📎 Attachment";
  }

  const text = message.text || "";
  return text.trim() || "New message";
};

const normaliseId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }
  return `${value}`;
};

const normaliseMessage = (message) => {
  if (!message) return null;
  const senderId = normaliseId(message.senderId ?? message.sender);
  const receiverId = normaliseId(message.receiverId ?? message.receiver);

  return {
    id:
      normaliseId(message.id) ||
      normaliseId(message._id) ||
      `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    chatId: normaliseId(message.chatId),
    senderId,
    receiverId,
    text: message.text || "",
    media: Array.isArray(message.media) ? message.media : [],
    status: message.status || "sent",
    callType: message.callType || null,
    callStatus: message.callStatus || null,
    callDuration: message.callDuration || 0,
    createdAt: message.createdAt || new Date().toISOString(),
    updatedAt:
      message.updatedAt || message.createdAt || new Date().toISOString(),
  };
};

const normaliseChatSummary = (chat) => {
  if (!chat?.targetUser?._id) return null;

  const targetId = normaliseId(chat.targetUser._id);
  const displayName =
    chat.targetUser.displayName || chat.targetUser.username || "Unknown user";
  const avatarUrl =
    chat.targetUser.profileImage?.url ||
    (typeof chat.targetUser.profileImage === "string"
      ? chat.targetUser.profileImage
      : null);

  return {
    id: targetId,
    chatId: normaliseId(chat.chatId),
    displayName,
    username: chat.targetUser.username,
    avatarUrl,
    isOnline: Boolean(chat.targetUser.isActive),
    lastSeen: chat.targetUser.lastActive || null,
    lastMessageText: buildMessagePreview(chat.lastMessage),
    lastMessageTime: chat.lastMessageAt
      ? formatTimestamp(chat.lastMessageAt)
      : "",
    unreadCount: chat.unreadCount || 0,
    updatedAt: chat.lastMessageAt || null,
    targetUser: chat.targetUser,
    canMessage: chat.canMessage !== undefined ? Boolean(chat.canMessage) : true,
    canCall: chat.canCall !== undefined ? Boolean(chat.canCall) : true,
    blockedBy: Array.isArray(chat.blockedBy) ? chat.blockedBy : [],
    hiddenFor: Array.isArray(chat.hiddenFor) ? chat.hiddenFor : [],
    isBlocked: Boolean(chat.isBlocked),
    isBlockedBySelf: Boolean(chat.isBlocked),
    isBlockedByTarget: Boolean(chat.isBlockedByTarget),
    raw: chat,
  };
};

const Chat = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messagesByPartner, setMessagesByPartner] = useState({});
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [callSession, setCallSession] = useState(null);
  const [blockingChat, setBlockingChat] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);

  const socketRef = useRef(null);
  const chatsRef = useRef([]);
  const activeChatIdRef = useRef(null);
  const messagesRef = useRef({});
  const callSessionRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const fetchedChatsRef = useRef(new Set());
  const disconnectTimerRef = useRef(null);

  const selfId =
    normaliseId(user?._id) ||
    normaliseId(user?.id) ||
    normaliseId(user?._id?._id);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openChat = params.get("open");

    if (openChat && openChat !== activeChatIdRef.current) {
      setActiveChatId(openChat);
      activeChatIdRef.current = openChat;
    }
  }, [location.search]);

  const loadChats = useCallback(
    async ({ silent = false, cancelledRef } = {}) => {
      if (!selfId) return;

      if (!silent) setLoadingChats(true);
      try {
        const { chats: payload = [] } = await getChatList();
        if (cancelledRef?.()) return;

        const formatted = payload
          .map(normaliseChatSummary)
          .filter(Boolean)
          .sort(
            (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
          );

        setChats(formatted);

        if (!activeChatIdRef.current && formatted.length > 0) {
          setActiveChatId(formatted[0].id);
        } else if (
          activeChatIdRef.current &&
          formatted.every((chat) => chat.id !== activeChatIdRef.current)
        ) {
          setActiveChatId(formatted[0]?.id || null);
        }
      } catch (error) {
        if (cancelledRef?.()) return;
        console.error("Failed to fetch chats", error);
        toast.error(error.response?.data?.message || "Failed to load chats");
      } finally {
        if (!silent && !cancelledRef?.()) {
          setLoadingChats(false);
        }
      }
    },
    [selfId]
  );

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    messagesRef.current = messagesByPartner;
  }, [messagesByPartner]);

  useEffect(() => {
    callSessionRef.current = callSession;
  }, [callSession]);

  useEffect(() => {
    fetchedChatsRef.current.clear();
  }, [selfId]);

  useEffect(() => {
    if (user === null) return;
    if (!selfId) {
      toast.error("Please log in to access Connect");
      navigate("/login");
    }
  }, [selfId, user, navigate]);

  const ensureSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["polling"],
        upgrade: false,
      });
    }
    return socketRef.current;
  }, []);

  const cleanupCall = useCallback(
    (notifyRemote = false) => {
      const session = callSessionRef.current;
      if (notifyRemote && session?.partnerId) {
        ensureSocket().emit("webrtc-signal", {
          to: session.partnerId,
          from: selfId,
          callType: session.type,
          signal: { type: "end" },
        });
      }

      if (peerRef.current) {
        peerRef.current.onicecandidate = null;
        peerRef.current.ontrack = null;
        peerRef.current.close();
        peerRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current = null;
      }

      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }

      setCallSession(null);
    },
    [ensureSocket, selfId]
  );

  useEffect(
    () => () => {
      cleanupCall(false);
      if (socketRef.current) {
        const socket = socketRef.current;
        if (socket.connected) {
          socket.disconnect();
        }
        socketRef.current = null;
      }
    },
    [cleanupCall]
  );

  const createPeerConnection = useCallback(
    (partnerId, callType) => {
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          ensureSocket().emit("webrtc-signal", {
            to: partnerId,
            from: selfId,
            callType,
            signal: { type: "candidate", candidate: event.candidate },
          });
        }
      };

      peer.ontrack = (event) => {
        const [stream] = event.streams;
        remoteStreamRef.current = stream;
        setCallSession((prev) =>
          prev
            ? {
                ...prev,
                remoteStream: stream,
                status: prev.status === "incoming" ? "active" : prev.status,
              }
            : prev
        );
      };

      const handleConnectionStateChange = () => {
        const state = peer.connectionState;

        if (state === "connected") {
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
          setCallSession((prev) =>
            prev ? { ...prev, status: "active" } : prev
          );
        } else if (state === "disconnected") {
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
          }
          disconnectTimerRef.current = setTimeout(() => {
            const currentState = peer.connectionState;
            if (!["connected", "connecting"].includes(currentState)) {
              cleanupCall(false);
            }
          }, 5000);
        } else if (state === "failed" || state === "closed") {
          cleanupCall(false);
        }
      };

      peer.onconnectionstatechange = handleConnectionStateChange;
      peer.oniceconnectionstatechange = handleConnectionStateChange;

      return peer;
    },
    [cleanupCall, ensureSocket, selfId]
  );

  const updateChatSummaryAfterMessage = useCallback(
    (partnerId, message, isSelf) => {
      setChats((prev) => {
        const idx = prev.findIndex((chat) => chat.id === partnerId);
        if (idx === -1) return prev;

        const next = [...prev];
        const existing = next[idx];
        next[idx] = {
          ...existing,
          chatId: message.chatId || existing.chatId,
          lastMessageText: buildMessagePreview(message),
          lastMessageTime: formatTimestamp(message.createdAt),
          updatedAt: message.createdAt,
          unreadCount: isSelf
            ? existing.unreadCount
            : partnerId === activeChatIdRef.current
            ? 0
            : (existing.unreadCount || 0) + 1,
        };

        next.sort(
          (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );
        return next;
      });
    },
    []
  );

  const handlePresenceUpdate = useCallback(
    ({ userId, isOnline, lastActive }) => {
      if (!userId) return;
      const lastSeen = lastActive || null;

      setChats((prev) => {
        let changed = false;
        const next = prev.map((chat) => {
          if (chat.id !== userId) return chat;
          changed = true;
          return {
            ...chat,
            isOnline: Boolean(isOnline),
            lastSeen: lastSeen || chat.lastSeen,
            targetUser: chat.targetUser
              ? {
                  ...chat.targetUser,
                  isActive: Boolean(isOnline),
                  lastActive: lastSeen || chat.targetUser.lastActive,
                }
              : chat.targetUser,
          };
        });

        return changed ? next : prev;
      });
    },
    []
  );

  const handleChatCleared = useCallback(
    (payload = {}, { silent = false } = {}) => {
      const { chatId, participants = [], clearedBy } = payload;
      if (!participants.length) return;

      const partnerId = participants.find((id) => id && id !== selfId);
      if (!partnerId) return;

      fetchedChatsRef.current.delete(partnerId);

      setMessagesByPartner((prev) => {
        const entry = prev[partnerId];
        const next = {
          ...prev,
          [partnerId]: {
            chatId: chatId || entry?.chatId || null,
            items: [],
          },
        };
        return next;
      });

      const nowIso = new Date().toISOString();

      setChats((prev) => {
        let changed = false;
        const next = prev.map((chat) => {
          if (chat.id !== partnerId) return chat;
          changed = true;
          return {
            ...chat,
            chatId: chatId || chat.chatId,
            lastMessageText: "Chat cleared",
            lastMessageTime: formatTimestamp(nowIso),
            unreadCount: 0,
            updatedAt: nowIso,
          };
        });

        if (!changed) return prev;

        next.sort(
          (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );
        return next;
      });

      if (silent) {
        return;
      }

      if (clearedBy && clearedBy !== selfId) {
        const actorName =
          chatsRef.current.find((chat) => chat.id === clearedBy)?.displayName ||
          "Your contact";
        toast(`${actorName} cleared the conversation`);
        return;
      }

      if (!clearedBy || clearedBy !== selfId) {
        toast.success("Chat cleared");
      }
    },
    [selfId]
  );

  const handleSendMessage = useCallback(
    async ({ text, attachment }) => {
      const activeChat = chatsRef.current.find(
        (chat) => chat.id === activeChatIdRef.current
      );
      if (!activeChat) {
        toast.error("Select a conversation first");
        return;
      }

      if (activeChat.canMessage === false) {
        const message = activeChat.isBlockedByTarget
          ? "This user has blocked you. Messages are disabled."
          : "Unblock this user to send messages.";
        toast.error(message);
        return;
      }

      if (!text && !attachment) return;

      const partnerId = activeChat.id;
      const existingEntry = messagesRef.current[partnerId];
      const chatRoomId = existingEntry?.chatId || activeChat.chatId || null;
      const provisionalId = `tmp-${Date.now()}`;

      const provisionalMessage = normaliseMessage({
        id: provisionalId,
        chatId: chatRoomId,
        senderId: selfId,
        receiverId: partnerId,
        text: text || "",
        media: attachment
          ? [
              {
                url: "",
                type: detectMediaKind(attachment.type),
                name: attachment.name,
                isUploading: true,
              },
            ]
          : [],
        status: "sending",
        createdAt: new Date().toISOString(),
      });

      setMessagesByPartner((prev) => {
        const entry = prev[partnerId] || { items: [], chatId: chatRoomId };
        return {
          ...prev,
          [partnerId]: {
            chatId: chatRoomId,
            items: [...entry.items, provisionalMessage],
          },
        };
      });

      setSending(true);
      try {
        const payload = {};
        if (text) payload.text = text;
        if (attachment) payload.attachment = attachment;

        const { message } = await sendChatMessage(partnerId, payload);
        const normalised = normaliseMessage(message);

        setMessagesByPartner((prev) => {
          const entry = prev[partnerId] || {
            items: [],
            chatId: normalised.chatId,
          };
          const mappedItems = entry.items.map((item) =>
            item.id === provisionalId ? normalised : item
          );

          const deduped = [];
          const seen = new Set();

          mappedItems.forEach((item) => {
            if (!item) return;
            const key = item.id ? item.id.toString() : null;
            if (key) {
              if (seen.has(key)) return;
              seen.add(key);
            }
            deduped.push(item);
          });

          return {
            ...prev,
            [partnerId]: {
              chatId: normalised.chatId || entry.chatId,
              items: deduped,
            },
          };
        });

        updateChatSummaryAfterMessage(partnerId, normalised, true);
      } catch (error) {
        console.error("Failed to send message", error);
        toast.error(error.response?.data?.message || "Failed to send message");
        setMessagesByPartner((prev) => {
          const entry = prev[partnerId];
          if (!entry) return prev;
          return {
            ...prev,
            [partnerId]: {
              ...entry,
              items: entry.items.filter((item) => item.id !== provisionalId),
            },
          };
        });
      } finally {
        setSending(false);
      }
    },
    [selfId, updateChatSummaryAfterMessage]
  );

  const handleClearChat = useCallback(async () => {
    const activeChat = chatsRef.current.find(
      (chat) => chat.id === activeChatIdRef.current
    );
    if (!activeChat || clearingChat) return;

    const confirmClear = window.confirm(
      `Clear conversation with ${
        activeChat.displayName || activeChat.username || "this user"
      }?`
    );
    if (!confirmClear) return;

    setClearingChat(true);
    try {
      const response = await clearChat(activeChat.id);
      handleChatCleared(response, { silent: true });
      toast.success("Chat cleared");
    } catch (error) {
      console.error("Failed to clear chat", error);
      toast.error(error.response?.data?.message || "Failed to clear chat");
    } finally {
      setClearingChat(false);
    }
  }, [clearingChat, handleChatCleared]);

  const handleToggleBlock = useCallback(async () => {
    const activeChat = chatsRef.current.find(
      (chat) => chat.id === activeChatIdRef.current
    );
    if (!activeChat) {
      toast.error("Select a conversation first");
      return;
    }

    if (blockingChat) return;

    const partnerId = activeChat.id;
    const partnerIdStr = normaliseId(partnerId);
    const shouldBlock = !activeChat.isBlocked;
    const apiCall = shouldBlock ? blockChatUser : unblockChatUser;

    setBlockingChat(true);
    try {
      const response = await apiCall(partnerId);
      const blockedByRaw = Array.isArray(response?.blockedBy)
        ? response.blockedBy
        : Array.isArray(activeChat.blockedBy)
        ? activeChat.blockedBy
        : [];
      const blockedBy = blockedByRaw
        .map((entry) => normaliseId(entry))
        .filter((value) => Boolean(value));
      const selfIdStr = normaliseId(selfId);

      const isBlockedBySelf = selfIdStr ? blockedBy.includes(selfIdStr) : false;
      const isBlockedByTarget = partnerIdStr
        ? blockedBy.includes(partnerIdStr)
        : false;
      const canInteract = !(isBlockedBySelf || isBlockedByTarget);

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === partnerId
            ? {
                ...chat,
                blockedBy,
                isBlocked: isBlockedBySelf,
                isBlockedBySelf,
                isBlockedByTarget,
                canMessage: canInteract,
                canCall: canInteract,
              }
            : chat
        )
      );

      toast.success(shouldBlock ? "User blocked" : "User unblocked");
    } catch (error) {
      console.error("Failed to toggle block", error);
      toast.error(
        error.response?.data?.message ||
          (shouldBlock ? "Failed to block user" : "Failed to unblock user")
      );
    } finally {
      setBlockingChat(false);
    }
  }, [blockingChat, selfId]);

  const handleDeleteChat = useCallback(async () => {
    const activeChat = chatsRef.current.find(
      (chat) => chat.id === activeChatIdRef.current
    );
    if (!activeChat) {
      toast.error("Select a conversation first");
      return;
    }

    if (deletingChat) return;

    const partnerId = activeChat.id;
    setDeletingChat(true);
    try {
      await deleteChatForUser(partnerId);

      const filteredChats = chatsRef.current.filter(
        (chat) => chat.id !== partnerId
      );
      const fallbackActiveId = filteredChats[0]?.id || null;

      fetchedChatsRef.current.delete(partnerId);

      setChats(filteredChats);
      chatsRef.current = filteredChats;
      setMessagesByPartner((prev) => {
        const next = { ...prev };
        delete next[partnerId];
        return next;
      });
      if (activeChatIdRef.current === partnerId) {
        activeChatIdRef.current = fallbackActiveId;
      }
      setActiveChatId((prev) => (prev === partnerId ? fallbackActiveId : prev));

      toast.success("Chat removed");
    } catch (error) {
      console.error("Failed to remove chat", error);
      toast.error(error.response?.data?.message || "Failed to remove chat");
    } finally {
      setDeletingChat(false);
    }
  }, [deletingChat]);

  const handleBlockUpdate = useCallback(
    (payload = {}) => {
      const participantsRaw = Array.isArray(payload.participants)
        ? payload.participants
        : [];
      const selfIdStr = normaliseId(selfId);
      if (!selfIdStr) return;

      const participants = participantsRaw
        .map((id) => normaliseId(id))
        .filter((id) => Boolean(id));

      if (!participants.includes(selfIdStr)) return;

      const partnerId = participants.find((id) => id && id !== selfIdStr);
      if (!partnerId) return;

      const blockedBy = Array.isArray(payload.blockedBy)
        ? payload.blockedBy.map((id) => normaliseId(id)).filter(Boolean)
        : [];

      const existing = chatsRef.current.find((chat) => chat.id === partnerId);
      const prevBlockedByTarget = existing?.isBlockedByTarget || false;
      const prevBlockedBySelf =
        existing?.isBlocked || existing?.isBlockedBySelf || false;

      const isBlockedBySelf = blockedBy.includes(selfIdStr);
      const isBlockedByTarget = blockedBy.includes(partnerId);
      const canInteract = !(isBlockedBySelf || isBlockedByTarget);

      setChats((prev) => {
        const idx = prev.findIndex((chat) => chat.id === partnerId);
        if (idx === -1) return prev;

        const current = prev[idx];
        const nextChat = {
          ...current,
          blockedBy,
          isBlocked: isBlockedBySelf,
          isBlockedBySelf,
          isBlockedByTarget,
          canMessage: canInteract,
          canCall: canInteract,
        };

        const stateUnchanged =
          current.isBlocked === nextChat.isBlocked &&
          current.isBlockedByTarget === nextChat.isBlockedByTarget &&
          current.canMessage === nextChat.canMessage &&
          current.canCall === nextChat.canCall &&
          JSON.stringify(current.blockedBy || []) ===
            JSON.stringify(blockedBy || []);

        if (stateUnchanged) {
          return prev;
        }

        const next = [...prev];
        next[idx] = nextChat;
        return next;
      });

      const activeSession = callSessionRef.current;
      if (
        activeSession?.partnerId === partnerId &&
        (isBlockedByTarget || isBlockedBySelf) &&
        callSessionRef.current?.inCall
      ) {
        cleanupCall(false);
      }

      if (!existing) return;

      if (!prevBlockedByTarget && isBlockedByTarget) {
        const name = existing.displayName || existing.username || "This user";
        toast.error(`${name} has blocked you.`);
      } else if (
        prevBlockedByTarget &&
        !isBlockedByTarget &&
        !isBlockedBySelf
      ) {
        const name = existing.displayName || existing.username || "This user";
        toast.success(`${name} has unblocked you.`);
      }
    },
    [cleanupCall, selfId]
  );

  const handleChatDeleted = useCallback(
    (payload = {}) => {
      const participantsRaw = Array.isArray(payload.participants)
        ? payload.participants
        : [];
      const selfIdStr = normaliseId(selfId);
      if (!selfIdStr) return;

      if (payload.removedFor && normaliseId(payload.removedFor) !== selfIdStr)
        return;

      const participants = participantsRaw
        .map((id) => normaliseId(id))
        .filter((id) => Boolean(id));

      if (!participants.includes(selfIdStr)) return;

      const partnerId = participants.find((id) => id && id !== selfIdStr);
      if (!partnerId) return;

      const hasChat = chatsRef.current.some((chat) => chat.id === partnerId);
      if (!hasChat) return;

      const filteredChats = chatsRef.current.filter(
        (chat) => chat.id !== partnerId
      );
      const fallbackActiveId = filteredChats[0]?.id || null;

      fetchedChatsRef.current.delete(partnerId);

      setChats(filteredChats);
      chatsRef.current = filteredChats;
      setMessagesByPartner((prev) => {
        if (!prev[partnerId]) return prev;
        const next = { ...prev };
        delete next[partnerId];
        return next;
      });
      if (activeChatIdRef.current === partnerId) {
        activeChatIdRef.current = fallbackActiveId;
      }
      setActiveChatId((prev) => (prev === partnerId ? fallbackActiveId : prev));

      if (!deletingChat) {
        toast("Conversation removed");
      }
    },
    [deletingChat, selfId]
  );

  const handleCallError = useCallback(
    ({ code } = {}) => {
      if (!code) return;

      const messages = {
        chat_not_found: "Conversation not available for calling.",
        blocked_by_target: "This user has blocked you. Calls are disabled.",
        you_blocked_target: "Unblock this user to start a call.",
        call_setup_failed: "Call could not connect. Please try again.",
        insecure_context:
          "Calls require HTTPS or localhost. Switch to a secure connection and try again.",
      };

      const message = messages[code] || "Call unavailable right now.";
      toast.error(message);
      cleanupCall(false);
    },
    [cleanupCall]
  );

  const getUserMediaCompat = useCallback((constraints) => {
    const mediaDevices = navigator?.mediaDevices;
    const getUserMedia = mediaDevices?.getUserMedia;

    if (typeof getUserMedia === "function") {
      try {
        return getUserMedia.call(mediaDevices, constraints);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    if (typeof window !== "undefined" && window.isSecureContext === false) {
      const error = new Error("Calls require a secure context");
      error.code = "insecure_context";
      return Promise.reject(error);
    }

    const legacyGetUserMedia =
      navigator?.getUserMedia ||
      navigator?.webkitGetUserMedia ||
      navigator?.mozGetUserMedia ||
      navigator?.msGetUserMedia;

    if (legacyGetUserMedia) {
      return new Promise((resolve, reject) => {
        legacyGetUserMedia.call(navigator, constraints, resolve, reject);
      });
    }

    const error = new Error("Media devices API unsupported");
    error.code = "unsupported";
    return Promise.reject(error);
  }, []);

  const requestMediaStream = useCallback(
    async (callType) => {
      const initialConstraints =
        callType === "video"
          ? { audio: true, video: { facingMode: "user" } }
          : { audio: true, video: false };

      try {
        return await getUserMediaCompat(initialConstraints);
      } catch (error) {
        const name = error?.name;

        if (name === "NotAllowedError" || name === "SecurityError") {
          error.code = "permission_denied";
          throw error;
        }

        if (callType === "video") {
          if (name === "OverconstrainedError" || name === "NotFoundError") {
            try {
              return await getUserMediaCompat({ audio: true, video: true });
            } catch (fallbackError) {
              if (fallbackError?.name === "NotFoundError") {
                if (navigator?.mediaDevices?.enumerateDevices) {
                  try {
                    const devices =
                      await navigator.mediaDevices.enumerateDevices();
                    const hasCamera = devices.some(
                      (device) => device.kind === "videoinput"
                    );
                    if (!hasCamera) {
                      fallbackError.code = "no_camera";
                    }
                  } catch (enumerateError) {
                    console.warn("Failed to enumerate devices", enumerateError);
                  }
                }
                fallbackError.code = fallbackError.code || "no_camera";
              }
              throw fallbackError;
            }
          }
        } else if (callType === "audio" && name === "NotFoundError") {
          error.code = "no_microphone";
          throw error;
        }

        throw error;
      }
    },
    [getUserMediaCompat]
  );

  const describeMediaError = useCallback((error, callType) => {
    if (!error) {
      return callType === "video"
        ? "Unable to start video call"
        : "Unable to start voice call";
    }

    const code = error.code || error.name;
    if (
      code === "permission_denied" ||
      code === "NotAllowedError" ||
      code === "SecurityError"
    ) {
      return "Please allow microphone and camera access to start a call.";
    }
    if (code === "insecure_context") {
      return "Calls require HTTPS or localhost. Switch to a secure connection and try again.";
    }
    if (code === "no_camera") {
      return "No camera detected. Connect a camera and try again.";
    }
    if (code === "no_microphone") {
      return "No microphone detected. Connect a microphone and try again.";
    }
    if (code === "unsupported") {
      return "Calling isn't supported in this browser. Update or try a modern browser.";
    }
    if (code === "NotFoundError") {
      return callType === "video"
        ? "Camera not available. Check your device and permissions."
        : "Microphone not available. Check your device and permissions.";
    }

    return callType === "video"
      ? "Unable to start video call"
      : "Unable to start voice call";
  }, []);

  const startCall = useCallback(
    async (callType) => {
      const activeChat = chatsRef.current.find(
        (chat) => chat.id === activeChatIdRef.current
      );
      if (!activeChat) {
        toast.error("Select a conversation first");
        return;
      }

      if (activeChat.canCall === false) {
        const message = activeChat.isBlockedByTarget
          ? "This user has blocked you. Calls are disabled."
          : "Unblock this user to start a call.";
        toast.error(message);
        return;
      }

      try {
        const stream = await requestMediaStream(callType);
        localStreamRef.current = stream;

        setCallSession({
          inCall: true,
          type: callType,
          partnerId: activeChat.id,
          partner: activeChat,
          isCaller: true,
          status: "calling",
          localStream: stream,
          remoteStream: null,
        });

        const peer = createPeerConnection(activeChat.id, callType);
        peerRef.current = peer;

        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        ensureSocket().emit("webrtc-signal", {
          to: activeChat.id,
          from: selfId,
          callType,
          signal: offer,
        });
      } catch (error) {
        console.error("Failed to start call", error);
        toast.error(describeMediaError(error, callType));
        cleanupCall(false);
      }
    },
    [
      createPeerConnection,
      ensureSocket,
      cleanupCall,
      selfId,
      requestMediaStream,
      describeMediaError,
    ]
  );

  const acceptCall = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session?.incomingOffer || !session.partnerId) return;

    try {
      const stream = await requestMediaStream(session.type || "audio");
      localStreamRef.current = stream;

      const peer = createPeerConnection(session.partnerId, session.type);
      peerRef.current = peer;

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      await peer.setRemoteDescription(
        new RTCSessionDescription(session.incomingOffer)
      );
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      ensureSocket().emit("webrtc-signal", {
        to: session.partnerId,
        from: selfId,
        callType: session.type,
        signal: answer,
      });

      setCallSession((prev) =>
        prev
          ? {
              ...prev,
              status: "active",
              localStream: stream,
              incomingOffer: null,
            }
          : prev
      );
    } catch (error) {
      console.error("Failed to accept call", error);
      toast.error(
        describeMediaError(error, callSessionRef.current?.type || "audio")
      );
      cleanupCall(true);
    }
  }, [
    createPeerConnection,
    ensureSocket,
    cleanupCall,
    requestMediaStream,
    describeMediaError,
    selfId,
  ]);

  const declineCall = useCallback(() => {
    const session = callSessionRef.current;
    if (session?.partnerId) {
      ensureSocket().emit("webrtc-signal", {
        to: session.partnerId,
        from: selfId,
        callType: session.type,
        signal: { type: "end" },
      });
    }
    cleanupCall(false);
  }, [ensureSocket, cleanupCall, selfId]);

  const endCall = useCallback(() => {
    cleanupCall(true);
  }, [cleanupCall]);

  useEffect(() => {
    if (!selfId) return;

    let cancelled = false;
    loadChats({ cancelledRef: () => cancelled });

    return () => {
      cancelled = true;
    };
  }, [selfId, loadChats]);

  useEffect(() => {
    if (!selfId) return;

    const socket = ensureSocket();

    const handleIncomingMessage = (payload) => {
      const message = normaliseMessage(payload);
      if (!message) return;

      const partnerId =
        message.senderId === selfId ? message.receiverId : message.senderId;
      const existingChat =
        chatsRef.current.find((chat) => chat.id === partnerId) || null;

      if (message.senderId !== selfId) {
        handlePresenceUpdate({
          userId: message.senderId,
          isOnline: true,
          lastActive: message.createdAt,
        });
      }

      setMessagesByPartner((prev) => {
        const entry = prev[partnerId] || {
          items: [],
          chatId: message.chatId || null,
        };
        const items = entry.items || [];

        const index = items.findIndex((item) => {
          if (!item) return false;
          if (item.id && message.id) {
            if (item.id === message.id) return true;
            if (
              item.id.toString &&
              item.id.toString() === message.id.toString()
            )
              return true;
          }
          if (
            message.senderId === selfId &&
            item.senderId === selfId &&
            item.status === "sending" &&
            item.text === message.text
          ) {
            const itemTime = new Date(item.createdAt).getTime();
            const messageTime = new Date(message.createdAt).getTime();
            if (Number.isFinite(itemTime) && Number.isFinite(messageTime)) {
              if (Math.abs(itemTime - messageTime) < 5000) {
                return true;
              }
            }
          }
          return false;
        });

        if (index !== -1) {
          const updatedItems = [...items];
          updatedItems[index] = { ...updatedItems[index], ...message };
          return {
            ...prev,
            [partnerId]: {
              chatId: message.chatId || entry.chatId,
              items: updatedItems,
            },
          };
        }

        return {
          ...prev,
          [partnerId]: {
            chatId: message.chatId || entry.chatId,
            items: [...items, message],
          },
        };
      });

      updateChatSummaryAfterMessage(
        partnerId,
        message,
        message.senderId === selfId
      );

      if (
        message.senderId !== selfId &&
        partnerId !== activeChatIdRef.current
      ) {
        const counterpart = chatsRef.current.find(
          (chat) => chat.id === partnerId
        );
        const name = counterpart?.displayName || "Someone";
        toast.success(`New message from ${name}`);
      }

      if (!existingChat) {
        loadChats({ silent: true });
      }
    };

    const handleSignal = async ({ from, callType, signal }) => {
      if (!signal || from === selfId) return;

      const partnerChat =
        chatsRef.current.find((chat) => chat.id === from) || null;

      if (signal.type === "offer") {
        setActiveChatId((prev) => prev || from);
        setCallSession({
          inCall: true,
          type: callType,
          partnerId: from,
          partner: partnerChat,
          isCaller: false,
          status: "incoming",
          incomingOffer: signal,
          localStream: null,
          remoteStream: null,
        });
      } else if (signal.type === "answer") {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(signal)
          );
          setCallSession((prev) =>
            prev ? { ...prev, status: "active" } : prev
          );
        }
      } else if (signal.type === "candidate" && signal.candidate) {
        if (peerRef.current) {
          try {
            await peerRef.current.addIceCandidate(
              new RTCIceCandidate(signal.candidate)
            );
          } catch (error) {
            console.error("Failed to add ICE candidate", error);
          }
        }
      } else if (signal.type === "end") {
        toast("Call ended");
        cleanupCall(false);
      }
    };

    socket.on("receiveMessage", handleIncomingMessage);
    socket.on("webrtc-signal", handleSignal);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("chat:cleared", handleChatCleared);
    socket.on("chat:blockUpdate", handleBlockUpdate);
    socket.on("chat:deleted", handleChatDeleted);
    socket.on("call:error", handleCallError);
    socket.emit("user:register", selfId);

    return () => {
      socket.off("receiveMessage", handleIncomingMessage);
      socket.off("webrtc-signal", handleSignal);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("chat:cleared", handleChatCleared);
      socket.off("chat:blockUpdate", handleBlockUpdate);
      socket.off("chat:deleted", handleChatDeleted);
      socket.off("call:error", handleCallError);
    };
  }, [
    ensureSocket,
    selfId,
    updateChatSummaryAfterMessage,
    cleanupCall,
    loadChats,
    handlePresenceUpdate,
    handleChatCleared,
    handleBlockUpdate,
    handleChatDeleted,
    handleCallError,
  ]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || null,
    [chats, activeChatId]
  );

  const activeMessagesEntry = activeChat
    ? messagesByPartner[activeChat.id]
    : null;
  const currentMessages = activeMessagesEntry?.items || [];
  const currentChatRoomId =
    activeMessagesEntry?.chatId || activeChat?.chatId || null;
  const activeChatCanMessage = activeChat
    ? activeChat.canMessage !== false
    : true;
  const activeChatCanCall = activeChat ? activeChat.canCall !== false : true;
  const activeChatBlocked = Boolean(
    activeChat?.isBlocked || activeChat?.isBlockedBySelf
  );
  const activeChatBlockedByTarget = Boolean(activeChat?.isBlockedByTarget);

  useEffect(() => {
    if (!activeChat || !selfId) return;

    const existing = messagesRef.current[activeChat.id];
    if (existing?.items?.length) {
      setChats((prev) => {
        const idx = prev.findIndex((chat) => chat.id === activeChat.id);
        if (idx === -1) return prev;
        const current = prev[idx];
        if ((current.unreadCount || 0) === 0) return prev;
        const next = [...prev];
        next[idx] = { ...current, unreadCount: 0 };
        return next;
      });
      return;
    }

    if (fetchedChatsRef.current.has(activeChat.id)) return;
    fetchedChatsRef.current.add(activeChat.id);

    setLoadingMessages(true);
    getChatMessages(activeChat.id)
      .then(({ chatId, messages = [] }) => {
        const normalised = messages.map(normaliseMessage);
        setMessagesByPartner((prev) => ({
          ...prev,
          [activeChat.id]: {
            chatId: normaliseId(chatId) || activeChat.chatId || null,
            items: normalised,
          },
        }));
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === activeChat.id
              ? {
                  ...chat,
                  chatId: normaliseId(chatId) || chat.chatId,
                  unreadCount: 0,
                  updatedAt: normalised.length
                    ? normalised[normalised.length - 1].createdAt
                    : chat.updatedAt,
                }
              : chat
          )
        );
      })
      .catch((error) => {
        console.error("Failed to load messages", error);
        toast.error(
          error.response?.data?.message || "Failed to load conversation"
        );
        fetchedChatsRef.current.delete(activeChat.id);
      })
      .finally(() => setLoadingMessages(false));
  }, [activeChat, selfId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket && currentChatRoomId) {
      socket.emit("joinChat", currentChatRoomId);
    }
  }, [currentChatRoomId]);

  useEffect(() => {
    if (!callSession?.inCall) return;

    if (
      callSession.localStream &&
      callSession.type === "video" &&
      localVideoRef.current
    ) {
      localVideoRef.current.srcObject = callSession.localStream;
    }

    if (callSession.remoteStream) {
      if (callSession.type === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = callSession.remoteStream;
      } else if (callSession.type === "audio" && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = callSession.remoteStream;
      }
    }
  }, [callSession]);

  const renderCallOverlay = () => {
    if (!callSession?.inCall) return null;

    const status = callSession.status;
    const isIncoming = status === "incoming" && !callSession.isCaller;
    const partnerName =
      callSession.partner?.displayName ||
      callSession.partner?.username ||
      "Unknown";

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-900 text-white w-full max-w-xl rounded-3xl p-6 space-y-6 relative">
          <button
            type="button"
            onClick={endCall}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            ×
          </button>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">
              {callSession.type === "video" ? "Video Call" : "Voice Call"}
            </h3>
            <p className="text-sm text-gray-300">
              {isIncoming ? `${partnerName} is calling…` : partnerName}
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {status}
            </p>
          </div>

          {callSession.type === "video" ? (
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 w-32 h-32 object-cover rounded-xl border-2 border-white"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-6">
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-semibold">
                {partnerName.charAt(0).toUpperCase()}
              </div>
              <audio ref={remoteAudioRef} autoPlay />
            </div>
          )}

          <div className="flex justify-center space-x-4">
            {isIncoming ? (
              <>
                <button
                  onClick={acceptCall}
                  className="px-5 py-2 bg-green-500 hover:bg-green-600 rounded-full text-sm font-medium"
                >
                  Accept
                </button>
                <button
                  onClick={declineCall}
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 rounded-full text-sm font-medium"
                >
                  Decline
                </button>
              </>
            ) : (
              <button
                onClick={endCall}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 rounded-full text-sm font-medium"
              >
                End Call
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="bg-blue-50 dark:bg-gray-900 no-horizontal-scroll"
      style={{ height: "calc(100vh - 80px)" }}
    >
      {renderCallOverlay()}
      <div
        className="hidden lg:flex no-horizontal-scroll"
        style={{ height: "calc(100vh - 80px)" }}
      >
        <div className="w-full flex flex-col">
          <div className="h-16 bg-white dark:bg-gray-800 border-b border-blue-100 dark:border-gray-700 flex items-center justify-between px-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <IoArrowBack className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </button>
            <h1 className="text-xl font-semibold text-blue-900 dark:text-white">
              Connect
            </h1>
            <span className="w-6" />
          </div>

          <div className="flex-1 flex no-horizontal-scroll">
            <ChatList
              chats={chats}
              activeChat={activeChat}
              onChatSelect={(chat) => setActiveChatId(chat.id)}
              isLoading={loadingChats}
            />

            <div className="flex-1 flex flex-col no-horizontal-scroll">
              <ChatHeader
                chat={activeChat}
                onStartAudioCall={() => startCall("audio")}
                onStartVideoCall={() => startCall("video")}
                onClearChat={handleClearChat}
                onToggleBlock={handleToggleBlock}
                onDeleteChat={handleDeleteChat}
                isBlocked={activeChatBlocked}
                isBlockedByTarget={activeChatBlockedByTarget}
                blocking={blockingChat}
                deleting={deletingChat}
                isCallDisabled={!activeChat || !activeChatCanCall || sending}
                clearingChat={clearingChat}
              />
              <ChatWindow
                chat={activeChat}
                messages={currentMessages}
                currentUserId={selfId}
                isLoading={loadingMessages}
              />
              {activeChat && (
                <MessageInput
                  onSendMessage={handleSendMessage}
                  disabled={
                    !activeChat || !activeChatCanMessage || clearingChat
                  }
                  sending={sending || clearingChat}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="lg:hidden flex flex-col no-horizontal-scroll"
        style={{ height: "calc(100vh - 80px)" }}
      >
        {!activeChat ? (
          <>
            <div className="h-14 bg-blue-600 flex items-center justify-between px-4 text-white flex-shrink-0">
              <h1 className="text-xl font-medium">Connect</h1>
            </div>
            <div className="flex-1 bg-white dark:bg-gray-800 no-horizontal-scroll">
              <ChatList
                chats={chats}
                activeChat={activeChat}
                onChatSelect={(chat) => setActiveChatId(chat.id)}
                isLoading={loadingChats}
              />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col no-scroll">
            <ChatHeader
              chat={activeChat}
              onBack={() => setActiveChatId(null)}
              onStartAudioCall={() => startCall("audio")}
              onStartVideoCall={() => startCall("video")}
              onClearChat={handleClearChat}
              onToggleBlock={handleToggleBlock}
              onDeleteChat={handleDeleteChat}
              isBlocked={activeChatBlocked}
              isBlockedByTarget={activeChatBlockedByTarget}
              blocking={blockingChat}
              deleting={deletingChat}
              isCallDisabled={!activeChat || !activeChatCanCall || sending}
              clearingChat={clearingChat}
            />
            <ChatWindow
              chat={activeChat}
              messages={currentMessages}
              currentUserId={selfId}
              isLoading={loadingMessages}
            />
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!activeChat || !activeChatCanMessage || clearingChat}
              sending={sending || clearingChat}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
