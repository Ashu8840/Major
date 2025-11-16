import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IoArrowBack,
  IoLockClosed,
  IoPeople,
  IoReload,
  IoMenu,
  IoClose,
  IoSearch,
} from "react-icons/io5";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import {
  fetchCircleDetails,
  fetchCircleMessages,
  sendCircleMessage,
  fetchCircles,
  joinSocialCircle,
  SOCKET_BASE_URL,
} from "../utils/api";
import UserAvatar from "../components/UserAvatar";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";
import {
  buildDisplayName,
  formatRelativeTime,
  normaliseId,
} from "../utils/socialHelpers";

const mapAttachmentToMedia = (attachment = {}) => ({
  type: attachment.type || "file",
  url: attachment.url,
  name: attachment.name,
  isUploading: Boolean(attachment.isUploading),
});

export default function CircleChat() {
  const { circleId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const selfId = useMemo(
    () => normaliseId(user?._id || user?.id || user?.userId),
    [user]
  );

  const [circleList, setCircleList] = useState([]);
  const [circleListLoading, setCircleListLoading] = useState(true);
  const [circleListError, setCircleListError] = useState(null);
  const [circleSearch, setCircleSearch] = useState("");
  const [joinDialog, setJoinDialog] = useState({ circle: null, key: "" });
  const [joiningCircleId, setJoiningCircleId] = useState(null);
  const [showCircleListMobile, setShowCircleListMobile] = useState(false);
  const [circle, setCircle] = useState(null);
  const [circleLoading, setCircleLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [messagePage, setMessagePage] = useState(1);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const shouldScrollToEndRef = useRef(true);
  const socketRef = useRef(null);
  const messageIdsRef = useRef(new Set());

  const transformMessage = useCallback(
    (message) => ({
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      media: Array.isArray(message.attachments)
        ? message.attachments.map(mapAttachmentToMedia)
        : [],
      sender: message.sender,
      senderId: normaliseId(message.sender?.id),
      senderName: buildDisplayName(message.sender),
      status: normaliseId(message.sender?.id) === selfId ? "sent" : undefined,
    }),
    [selfId]
  );

  const filteredCircles = useMemo(() => {
    const sorted = [...circleList].sort((a, b) => {
      const aMember = Boolean(a.membership);
      const bMember = Boolean(b.membership);
      if (aMember !== bMember) {
        return aMember ? -1 : 1;
      }
      const getTimestamp = (value) => {
        if (!value) return 0;
        const time = new Date(value).getTime();
        return Number.isNaN(time) ? 0 : time;
      };
      return getTimestamp(b.lastActivityAt) - getTimestamp(a.lastActivityAt);
    });

    const term = circleSearch.trim().toLowerCase();
    if (!term) return sorted;

    return sorted.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const description = item.description?.toLowerCase() || "";
      return name.includes(term) || description.includes(term);
    });
  }, [circleList, circleSearch]);

  const activeCircleSummary = useMemo(
    () => circleList.find((item) => item.id === circleId),
    [circleList, circleId]
  );

  const ensureSocket = useCallback(() => {
    if (!selfId) return null;

    if (!socketRef.current || !socketRef.current.connected) {
      // Clean up existing socket if any
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = io(SOCKET_BASE_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on("connect", () => {
        console.log("Socket connected to server");
        socket.emit("user:register", selfId);

        // If we already know the circleId, rejoin the room on reconnect
        if (circleId) {
          socket.emit("circle:join", { circleId });
          console.log("Rejoined circle room on reconnect:", circleId);
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });

      socket.on("reconnect", (attemptNumber) => {
        console.log("Socket reconnected after", attemptNumber, "attempts");
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });

      socketRef.current = socket;
    }

    return socketRef.current;
  }, [selfId, circleId]);

  const loadCircleList = useCallback(async () => {
    if (!selfId) return;
    setCircleListLoading(true);
    setCircleListError(null);
    try {
      const data = await fetchCircles();
      setCircleList(data?.circles || []);
    } catch (err) {
      console.error("Failed to load circles", err);
      const message = err.response?.data?.message || "Failed to load circles";
      setCircleListError(message);
      toast.error(message);
    } finally {
      setCircleListLoading(false);
    }
  }, [selfId]);

  const loadCircleDetails = useCallback(async () => {
    if (!circleId) return;
    setCircleLoading(true);
    setError(null);
    try {
      const { circle: circleData } = await fetchCircleDetails(circleId);
      setCircle(circleData);
      setCircleList((prev) => {
        const summary = {
          id: circleData.id,
          name: circleData.name,
          description: circleData.description,
          visibility: circleData.visibility,
          requiresKey: circleData.visibility === "private",
          memberCount: circleData.memberCount,
          membership: circleData.membership,
          theme: circleData.theme,
          owner: circleData.owner,
          membersPreview: circleData.membersPreview,
          lastActivityAt: circleData.lastActivityAt,
        };

        if (!prev || prev.length === 0) {
          return [summary];
        }

        const exists = prev.some((item) => item.id === summary.id);
        if (!exists) {
          return [summary, ...prev];
        }

        return prev.map((item) =>
          item.id === summary.id ? { ...item, ...summary } : item
        );
      });
    } catch (err) {
      console.error("Failed to load circle", err);
      const message = err.response?.data?.message || "Failed to load circle";
      setError(message);
      toast.error(message);
    } finally {
      setCircleLoading(false);
    }
  }, [circleId]);

  const loadMessages = useCallback(
    async (page = 1, { append = false } = {}) => {
      if (!circleId) return;
      if (append) {
        setLoadingMore(true);
      } else {
        setMessagesLoading(true);
      }
      setError(null);
      try {
        const { messages: apiMessages, pagination: pageInfo } =
          await fetchCircleMessages(circleId, page);
        const transformed = apiMessages.map(transformMessage);
        setPagination(pageInfo);
        setMessagePage(page);

        if (append) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const unique = transformed.filter(
              (item) => !existingIds.has(item.id)
            );
            return [...unique, ...prev];
          });
        } else {
          setMessages(transformed);
        }
        shouldScrollToEndRef.current = !append;
      } catch (err) {
        console.error("Failed to load messages", err);
        const message =
          err.response?.data?.message || "Failed to load messages";
        setError(message);
        toast.error(message);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setMessagesLoading(false);
        }
      }
    },
    [circleId, transformMessage]
  );

  useEffect(() => {
    loadCircleList();
  }, [loadCircleList]);

  useEffect(() => {
    loadCircleDetails();
  }, [loadCircleDetails]);

  useEffect(() => {
    loadMessages(1, { append: false });
  }, [loadMessages]);

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((message) => message.id));
  }, [messages]);

  useEffect(() => {
    if (!selfId) return;
    const socket = ensureSocket();
    if (!socket) return;

    if (socket.connected) {
      socket.emit("user:register", selfId);
    }
  }, [ensureSocket, selfId]);

  useEffect(() => {
    if (!selfId || !circleId) return;
    const socket = ensureSocket();
    if (!socket) return;

    const handleIncomingCircleMessage = (payload) => {
      console.log("Received circle message:", payload);

      if (!payload || payload.circleId !== circleId) {
        console.log("Message not for this circle, ignoring");
        return;
      }

      const formatted = transformMessage(payload);

      if (messageIdsRef.current.has(formatted.id)) {
        console.log("Message already exists, skipping:", formatted.id);
        return;
      }

      console.log("Adding new message:", formatted.id);
      messageIdsRef.current.add(formatted.id);

      setMessages((prev) => {
        const exists = prev.some((item) => item.id === formatted.id);
        if (exists) return prev;
        return [...prev, formatted];
      });

      setCircle((prev) =>
        prev
          ? {
              ...prev,
              lastActivityAt: formatted.createdAt,
            }
          : prev
      );

      setCircleList((prev) => {
        if (!prev || prev.length === 0) return prev;
        return prev.map((item) =>
          item.id === circleId
            ? { ...item, lastActivityAt: formatted.createdAt }
            : item
        );
      });

      shouldScrollToEndRef.current = true;
    };

    socket.on("circle:message", handleIncomingCircleMessage);

    // Join the circle room immediately (reconnect case or late join)
    if (socket.connected) {
      socket.emit("circle:join", { circleId });
      console.log("Joined circle room (effect):", circleId);
    }

    return () => {
      socket.off("circle:message", handleIncomingCircleMessage);
      socket.emit("circle:leave", { circleId });
      console.log("Left circle room:", circleId);
    };
  }, [circleId, ensureSocket, selfId, transformMessage]);

  useEffect(
    () => () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (shouldScrollToEndRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    shouldScrollToEndRef.current = true;
  }, [messages]);

  useEffect(() => {
    setShowCircleListMobile(false);
  }, [circleId]);

  const handleBack = () => {
    navigate("/social", { state: { focusTab: "circles" } });
  };

  const handleReload = async () => {
    await Promise.all([
      loadCircleDetails(),
      loadMessages(1, { append: false }),
      loadCircleList(),
    ]);
  };

  const handleLoadOlder = async () => {
    if (!pagination) return;
    if (messagePage >= pagination.totalPages) return;
    await loadMessages(messagePage + 1, { append: true });
  };

  const performJoinCircle = useCallback(
    async (targetCircle, keyInput = "") => {
      if (!targetCircle?.id) return;

      const requiresKey =
        targetCircle.requiresKey ?? targetCircle.visibility === "private";
      const trimmedKey = keyInput.trim();

      if (requiresKey && trimmedKey.length !== 4) {
        toast.error("Join key must be 4 digits");
        return;
      }

      try {
        setJoiningCircleId(targetCircle.id);
        const { circle: updated } = await joinSocialCircle(
          targetCircle.id,
          requiresKey ? trimmedKey : undefined
        );
        toast.success(`Joined ${updated.name}`);

        setCircleList((prev) => [
          updated,
          ...prev.filter((item) => item.id !== updated.id),
        ]);

        if (updated.id === circleId) {
          const socket = ensureSocket();
          if (socket) {
            socket.emit("circle:join", { circleId: updated.id });
          }
          await Promise.all([
            loadCircleDetails(),
            loadMessages(1, { append: false }),
          ]);
        } else {
          navigate(`/social/chat/${updated.id}`);
        }

        setJoinDialog({ circle: null, key: "" });
        setShowCircleListMobile(false);
      } catch (err) {
        console.error("Failed to join circle", err);
        toast.error(err.response?.data?.message || "Failed to join circle");
      } finally {
        setJoiningCircleId(null);
      }
    },
    [circleId, ensureSocket, loadCircleDetails, loadMessages, navigate]
  );

  const handleJoinCircleClick = useCallback(
    (targetCircle) => {
      if (!targetCircle) return;
      const requiresKey =
        targetCircle.requiresKey ?? targetCircle.visibility === "private";
      if (requiresKey) {
        setJoinDialog({ circle: targetCircle, key: "" });
      } else {
        performJoinCircle(targetCircle);
      }
    },
    [performJoinCircle]
  );

  const closeJoinDialog = useCallback(() => {
    setJoinDialog({ circle: null, key: "" });
  }, []);

  const handleJoinDialogSubmit = async (event) => {
    event.preventDefault();
    if (!joinDialog.circle) return;
    await performJoinCircle(joinDialog.circle, joinDialog.key);
  };

  const handleSelectCircle = useCallback(
    (targetCircle) => {
      if (!targetCircle) {
        setShowCircleListMobile(false);
        return;
      }

      if (!targetCircle.membership) {
        handleJoinCircleClick(targetCircle);
        return;
      }

      if (targetCircle.id === circleId) {
        setShowCircleListMobile(false);
        return;
      }

      setShowCircleListMobile(false);
      navigate(`/social/chat/${targetCircle.id}`);
    },
    [circleId, handleJoinCircleClick, navigate]
  );

  const handleSendMessage = async ({ text, attachment }) => {
    if (!circle?.membership) {
      toast.error("Join this circle to start chatting.");
      return;
    }

    if (attachment) {
      toast.error("Circle attachments aren't supported yet.");
      return;
    }

    const trimmed = text?.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;

    // Create optimistic message
    const optimisticMessage = {
      id: tempId,
      text: trimmed,
      createdAt: new Date().toISOString(),
      media: [],
      sender: user,
      senderId: selfId,
      senderName: user?.displayName || user?.username || "You",
      status: "sending",
    };

    // Add to message IDs to prevent duplicate from socket
    messageIdsRef.current.add(tempId);

    // Add optimistic message
    setMessages((prev) => [...prev, optimisticMessage]);
    shouldScrollToEndRef.current = true;

    try {
      setSending(true);
      const { message } = await sendCircleMessage(circleId, { text: trimmed });

      // Remove temp message and let socket handle the real one
      messageIdsRef.current.delete(tempId);

      setMessages((prev) => {
        // Remove optimistic message
        const filtered = prev.filter((m) => m.id !== tempId);

        // Add real message if not already there (socket might have added it)
        if (!messageIdsRef.current.has(message.id)) {
          messageIdsRef.current.add(message.id);
          const formatted = transformMessage(message);
          return [...filtered, formatted];
        }
        return filtered;
      });

      setCircle((prev) =>
        prev
          ? {
              ...prev,
              lastActivityAt: message.createdAt,
            }
          : prev
      );

      setCircleList((prev) =>
        prev.map((item) =>
          item.id === circleId
            ? { ...item, lastActivityAt: message.createdAt }
            : item
        )
      );
    } catch (err) {
      console.error("Failed to send message", err);

      // Remove optimistic message on error
      messageIdsRef.current.delete(tempId);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));

      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const isMember = Boolean(circle?.membership);
  const canLoadMore = pagination && messagePage < pagination.totalPages;
  const activeCircleData = circle || activeCircleSummary || null;
  const activeCircleRequiresKey = activeCircleData
    ? activeCircleData.requiresKey ?? activeCircleData.visibility === "private"
    : false;
  const joiningActiveCircle = activeCircleData
    ? joiningCircleId === activeCircleData.id
    : false;

  return (
    <div className="h-full bg-blue-50 dark:bg-gray-900">
      <div className="relative mx-auto h-full max-w-7xl px-2 py-4 sm:px-4 lg:px-6">
        {showCircleListMobile && (
          <div
            className="fixed inset-0 z-30 bg-blue-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setShowCircleListMobile(false)}
            aria-hidden="true"
          />
        )}

        <div className="relative flex h-full min-h-[calc(100vh-180px)] flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl lg:flex-row">
          <aside
            className={`absolute inset-y-0 left-0 z-40 w-72 transform bg-white shadow-xl transition-transform duration-200 ease-out lg:relative lg:z-0 lg:h-full lg:w-80 lg:translate-x-0 lg:shadow-none ${
              showCircleListMobile
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3">
              <div className="flex items-center gap-2 text-blue-900">
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Circles
                </span>
              </div>
              <button
                onClick={() => setShowCircleListMobile(false)}
                className="rounded-full p-2 text-blue-500 transition hover:bg-blue-50 lg:hidden"
                aria-label="Close circles sidebar"
              >
                <IoClose className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-blue-50 p-4">
              <div className="relative">
                <IoSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                <input
                  type="text"
                  value={circleSearch}
                  onChange={(event) => setCircleSearch(event.target.value)}
                  placeholder="Search circles"
                  className="w-full rounded-lg border border-blue-200 bg-blue-50/30 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="h-[calc(100%-120px)] overflow-y-auto px-2 pb-6">
              {circleListLoading ? (
                <div className="py-8 text-center text-sm text-blue-500">
                  Loading circles…
                </div>
              ) : circleListError ? (
                <div className="py-8 text-center text-sm text-red-500">
                  {circleListError}
                </div>
              ) : filteredCircles.length === 0 ? (
                <div className="py-8 text-center text-sm text-blue-500">
                  No circles yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCircles.map((item) => {
                    const isActive = item.id === circleId;
                    const isMember = Boolean(item.membership);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectCircle(item)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-blue-500 bg-blue-50 text-blue-900 shadow"
                            : "border-transparent bg-blue-50/40 text-blue-800 hover:border-blue-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold line-clamp-1">
                            {item.name}
                          </p>
                          {isMember ? (
                            <span className="text-xs font-semibold uppercase text-green-600">
                              Joined
                            </span>
                          ) : (
                            <span className="text-xs font-semibold uppercase text-blue-500">
                              {joiningCircleId === item.id
                                ? "Joining…"
                                : item.requiresKey ??
                                  item.visibility === "private"
                                ? "Key required"
                                : "Join"}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-blue-500">
                          <span className="inline-flex items-center gap-1">
                            <IoPeople className="h-3.5 w-3.5" />{" "}
                            {item.memberCount} members
                          </span>
                          {item.visibility === "private" && (
                            <span className="inline-flex items-center gap-1 text-blue-600">
                              <IoLockClosed className="h-3.5 w-3.5" /> Private
                            </span>
                          )}
                          {item.lastActivityAt && (
                            <span>
                              Active {formatRelativeTime(item.lastActivityAt)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex h-full flex-1 flex-col border-t border-blue-100/70 lg:border-l lg:border-t-0">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCircleListMobile(true)}
                  className="rounded-full border border-blue-200 p-2 text-blue-600 transition hover:bg-blue-100 lg:hidden"
                  aria-label="Open circles sidebar"
                >
                  <IoMenu className="h-5 w-5" />
                </button>
                <button
                  onClick={handleBack}
                  className="hidden rounded-full border border-blue-200 p-2 text-blue-600 transition hover:bg-blue-100 sm:inline-flex"
                  aria-label="Back to circles"
                >
                  <IoArrowBack className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {(
                      circle?.membersPreview ||
                      activeCircleSummary?.membersPreview ||
                      []
                    )
                      .slice(0, 3)
                      .map((member) => (
                        <UserAvatar
                          key={member.id}
                          user={member.user}
                          size="sm"
                          className="border-2 border-white shadow-sm"
                        />
                      ))}
                    {(!circle?.membersPreview ||
                      circle.membersPreview.length === 0) &&
                      (!activeCircleSummary?.membersPreview ||
                        activeCircleSummary.membersPreview.length === 0) && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                          {(circle?.name || activeCircleSummary?.name || "C")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-blue-900 sm:text-xl">
                      {circleLoading
                        ? "Loading circle…"
                        : circle?.name ||
                          activeCircleSummary?.name ||
                          "Circle chat"}
                    </h1>
                    {(circle || activeCircleSummary) && (
                      <p className="flex flex-wrap items-center gap-2 text-xs text-blue-500 sm:text-sm">
                        <span className="inline-flex items-center gap-1">
                          <IoPeople className="h-3.5 w-3.5" />
                          {circle?.memberCount ??
                            activeCircleSummary?.memberCount ??
                            0}{" "}
                          members
                        </span>
                        {(circle?.visibility ??
                          activeCircleSummary?.visibility) === "private" && (
                          <span className="inline-flex items-center gap-1 text-blue-600">
                            <IoLockClosed className="h-3.5 w-3.5" /> Private
                          </span>
                        )}
                        {(circle?.lastActivityAt ||
                          activeCircleSummary?.lastActivityAt) && (
                          <span>
                            Active{" "}
                            {formatRelativeTime(
                              circle?.lastActivityAt ||
                                activeCircleSummary?.lastActivityAt
                            )}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReload}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                >
                  <IoReload
                    className={`h-4 w-4 ${
                      messagesLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-hidden bg-blue-50/60">
              <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-blue-500">Loading messages…</p>
                  </div>
                ) : error && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <p className="max-w-sm text-blue-500">{error}</p>
                  </div>
                ) : !isMember ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <div className="max-w-sm space-y-4">
                      <p className="text-blue-600 font-medium">
                        Join this circle to view the conversation.
                      </p>
                      <p className="text-sm text-blue-500">
                        {activeCircleRequiresKey
                          ? "Enter the access key provided by the circle owner to join."
                          : "Join instantly to start chatting with everyone inside."}
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            activeCircleData &&
                            handleJoinCircleClick(activeCircleData)
                          }
                          disabled={!activeCircleData || joiningActiveCircle}
                          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                            !activeCircleData || joiningActiveCircle
                              ? "bg-blue-200 text-white cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {joiningActiveCircle
                            ? "Joining..."
                            : activeCircleRequiresKey
                            ? "Join with key"
                            : "Join circle"}
                        </button>
                        <button
                          type="button"
                          onClick={handleBack}
                          className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                        >
                          Back to circles
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {canLoadMore && (
                      <div className="mb-4 text-center">
                        <button
                          onClick={handleLoadOlder}
                          disabled={loadingMore}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-60"
                        >
                          {loadingMore ? "Loading…" : "Load previous messages"}
                        </button>
                      </div>
                    )}

                    {messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-blue-500">
                          No messages yet. Say hello!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isOwn = message.senderId === selfId;
                          return (
                            <div key={message.id}>
                              {!isOwn && (
                                <div className="mb-1 pl-2 text-xs text-blue-500">
                                  {message.senderName}
                                </div>
                              )}
                              <MessageBubble message={message} isOwn={isOwn} />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-blue-100 bg-white">
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={!isMember}
                sending={sending}
              />
              {!isMember && (
                <p className="px-4 pb-4 text-xs text-blue-400">
                  Join the circle from the Social tab to start chatting.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {joinDialog.circle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/40 px-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-blue-900">
                Join circle
              </h3>
              <p className="text-sm text-blue-500">
                Enter the 4-digit key to join "{joinDialog.circle.name}".
              </p>
            </div>
            <form onSubmit={handleJoinDialogSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-blue-700">
                  Join key
                </label>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={joinDialog.key}
                  onChange={(event) => {
                    const nextValue = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 4);
                    setJoinDialog((prev) => ({ ...prev, key: nextValue }));
                  }}
                  className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2 text-center text-lg font-semibold tracking-[0.5em] text-blue-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="••••"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeJoinDialog}
                  disabled={joiningCircleId === joinDialog.circle.id}
                  className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    joiningCircleId === joinDialog.circle.id ||
                    joinDialog.key.trim().length !== 4
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    joiningCircleId === joinDialog.circle.id ||
                    joinDialog.key.trim().length !== 4
                      ? "bg-blue-200 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {joiningCircleId === joinDialog.circle.id
                    ? "Joining..."
                    : "Join circle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
