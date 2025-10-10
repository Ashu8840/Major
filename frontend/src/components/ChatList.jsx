import { useMemo, useState } from "react";
import { IoSearch, IoEllipsisVertical } from "react-icons/io5";

const ChatList = ({ chats, activeChat, onChatSelect, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return chats;
    return chats.filter(
      (chat) =>
        chat.displayName?.toLowerCase().includes(term) ||
        chat.username?.toLowerCase().includes(term)
    );
  }, [chats, searchTerm]);

  return (
    <div className="w-full lg:w-[320px] xl:w-[360px] 2xl:w-[380px] bg-white dark:bg-gray-800 lg:border-r border-blue-100 dark:border-gray-700 flex flex-col h-full no-scroll">
      {/* Header - Hidden on mobile (handled by parent) */}
      <div className="hidden lg:flex items-center justify-between p-4 border-b border-blue-100 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-white">
          Chats
        </h2>
        <button className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full">
          <IoEllipsisVertical className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-blue-100 dark:border-gray-700 flex-shrink-0">
        <div className="relative">
          <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search or start a chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex p-3 space-x-2 border-b border-gray-100 dark:border-gray-700 lg:hidden flex-shrink-0">
        <button className="px-4 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          All
        </button>
        <button className="px-4 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
          Unread
        </button>
        <button className="px-4 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
          Favorites
        </button>
        <button className="px-4 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
          Groups
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 scrollable">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-gray-700 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-blue-100 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-blue-50 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-blue-500 dark:text-gray-400">
            <p className="font-medium mb-2">No chats yet</p>
            <p className="text-sm text-blue-400 dark:text-gray-500">
              Follow creators to start a conversation.
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat)}
              className={`flex items-center p-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-blue-50 dark:border-gray-700 ${
                activeChat?.id === chat.id
                  ? "bg-blue-100 dark:bg-blue-900/20"
                  : ""
              }`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 bg-blue-100 dark:bg-gray-600 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                {chat.avatarUrl ? (
                  <img
                    src={chat.avatarUrl}
                    alt={chat.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-lg font-semibold text-blue-600">
                    {chat.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-medium text-blue-900 dark:text-white truncate">
                    {chat.displayName}
                  </h3>
                  <span className="text-xs text-blue-500 dark:text-blue-400">
                    {chat.lastMessageTime}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-blue-600 dark:text-gray-300 truncate">
                    {chat.lastMessageText}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;
