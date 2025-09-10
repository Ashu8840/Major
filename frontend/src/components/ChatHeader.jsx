import {
  IoCall,
  IoVideocam,
  IoEllipsisVertical,
  IoArrowBack,
} from "react-icons/io5";

const ChatHeader = ({ chat, onBack }) => {
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
    <div className="h-16 bg-blue-600 text-white flex items-center justify-between px-4">
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
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
          {chat.avatar ? (
            <img
              src={chat.avatar}
              alt={chat.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-white">
              {chat.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-medium text-white">{chat.name}</h3>
          <p className="text-sm text-blue-100">
            {chat.isOnline ? "Online" : `Last seen ${chat.lastSeen}`}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button className="p-2 hover:bg-blue-700 rounded-full">
          <IoCall className="w-5 h-5 text-white" />
        </button>
        <button className="p-2 hover:bg-blue-700 rounded-full">
          <IoVideocam className="w-5 h-5 text-white" />
        </button>
        <button className="p-2 hover:bg-blue-700 rounded-full">
          <IoEllipsisVertical className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
