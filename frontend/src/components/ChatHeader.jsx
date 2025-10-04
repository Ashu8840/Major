import { useEffect, useMemo, useRef, useState } from "react";
import {
  IoCall,
  IoVideocam,
  IoEllipsisVertical,
  IoArrowBack,
  IoTrash,
  IoBan,
} from "react-icons/io5";

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Offline";
  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return "Offline";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return "Online";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${date.toLocaleDateString()}`;
};

const ChatHeader = ({
  chat,
  onBack,
  onStartAudioCall,
  onStartVideoCall,
  onClearChat,
  onToggleBlock,
  onDeleteChat,
  isBlocked = false,
  isBlockedByTarget = false,
  blocking = false,
  deleting = false,
  isCallDisabled = false,
  clearingChat = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!clearingChat) return;
    const timer = setTimeout(() => setIsMenuOpen(false), 600);
    return () => clearTimeout(timer);
  }, [clearingChat]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [chat?._id, chat?.id]);

  const presenceLabel = useMemo(() => {
    if (!chat) return "Offline";
    if (chat.isOnline) return "Online";
    return formatLastSeen(chat.lastSeen);
  }, [chat]);

  const callDisabled = isCallDisabled || isBlocked || isBlockedByTarget;
  const blockLabel = isBlocked ? "Unblock user" : "Block user";
  const blockDescription = isBlocked
    ? "Allow messages and calls again"
    : "Stop messages and calls";

  if (!chat) {
    return (
      <div className="h-16 bg-blue-50 dark:bg-gray-800 border-b border-blue-100 dark:border-gray-700 flex items-center justify-center">
        <p className="text-blue-500 dark:text-gray-400">
          Select a chat to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-16 bg-blue-600 text-white flex items-center justify-between px-4">
      {/* User Info */}
      <div className="flex items-center">
        {/* Back Button for Mobile */}
        {onBack && (
          <button
            onClick={onBack}
            className="mr-3 p-1 hover:bg-blue-700 rounded-full transition-colors lg:hidden"
          >
            <IoArrowBack className="w-6 h-6" />
          </button>
        )}
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 overflow-hidden">
          {chat.avatarUrl ? (
            <img
              src={chat.avatarUrl}
              alt={chat.displayName}
              className="w-10 h-10 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-sm font-semibold text-white">
              {chat.displayName?.charAt(0)?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-medium text-white">{chat.displayName}</h3>
          <p className="text-sm text-blue-100">{presenceLabel}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          className="p-2 hover:bg-blue-700 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={onStartAudioCall}
          disabled={callDisabled}
          title="Start voice call"
        >
          <IoCall className="w-5 h-5 text-white" />
        </button>
        <button
          className="p-2 hover:bg-blue-700 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={onStartVideoCall}
          disabled={callDisabled}
          title="Start video call"
        >
          <IoVideocam className="w-5 h-5 text-white" />
        </button>
        <div className="relative">
          <button
            className="p-2 hover:bg-blue-700 rounded-full"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
          >
            <IoEllipsisVertical className="w-5 h-5 text-white" />
          </button>
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 mt-2 w-48 rounded-md shadow-lg border border-blue-100 bg-white py-1 text-blue-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            >
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onToggleBlock?.();
                }}
                disabled={blocking}
                className="flex w-full items-start justify-between px-4 py-2 text-sm text-left hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={blockDescription}
              >
                <span className="flex items-center gap-2">
                  <IoBan className="w-4 h-4" />
                  {blockLabel}
                </span>
                {blocking && <span className="text-xs text-blue-400">…</span>}
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onDeleteChat?.();
                }}
                disabled={deleting}
                className="flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <IoTrash className="w-4 h-4" />
                  Remove chat
                </span>
                {deleting && <span className="text-xs text-blue-400">…</span>}
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onClearChat?.();
                }}
                disabled={clearingChat}
                className="flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <IoTrash className="w-4 h-4" />
                  Clear chat
                </span>
                {clearingChat && (
                  <span className="text-xs text-blue-400">…</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
