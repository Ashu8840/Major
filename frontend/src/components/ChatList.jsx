import { useState } from "react";
import { IoSearch, IoEllipsisVertical } from "react-icons/io5";

const ChatList = ({ chats, activeChat, onChatSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full lg:w-1/3 bg-white dark:bg-gray-800 lg:border-r border-blue-100 dark:border-gray-700 flex flex-col h-full no-scroll">
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
            placeholder="Ask Meta AI or Search"
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
        {filteredChats.map((chat) => (
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
            <div className="w-12 h-12 bg-blue-100 dark:bg-gray-600 rounded-full flex items-center justify-center mr-3">
              {chat.avatar ? (
                <img
                  src={chat.avatar}
                  alt={chat.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-blue-600">
                  {chat.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-medium text-blue-900 dark:text-white truncate">
                  {chat.name}
                </h3>
                <span className="text-xs text-blue-500 dark:text-blue-400">
                  {chat.lastMessageTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-blue-600 dark:text-gray-300 truncate">
                  {chat.lastMessage}
                </p>
                {chat.unreadCount > 0 && (
                  <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
