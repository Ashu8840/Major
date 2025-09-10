import { useState } from "react";
import { IoSend, IoAttach, IoHappy, IoMic } from "react-icons/io5";

const MessageInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-blue-100 dark:border-gray-700 p-4 mb-2">
      <div className="flex items-end space-x-3">
        {/* Attachment Button */}
        <button
          className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors"
          disabled={disabled}
        >
          <IoAttach className="w-5 h-5 text-blue-600 dark:text-gray-300" />
        </button>

        {/* Message Input Container */}
        <div className="flex-1 relative">
          <div className="flex items-end bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600">
            {/* Emoji Button */}
            <button
              className="p-3 hover:bg-blue-100 dark:hover:bg-gray-600 rounded-l-lg transition-colors"
              disabled={disabled}
            >
              <IoHappy className="w-5 h-5 text-blue-600 dark:text-gray-300" />
            </button>

            {/* Text Input */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message"
              disabled={disabled}
              rows={1}
              className="flex-1 py-3 px-0 bg-transparent text-blue-900 dark:text-white placeholder-blue-500 dark:placeholder-gray-400 resize-none focus:outline-none max-h-32 min-h-[24px]"
              style={{
                height: "auto",
                minHeight: "24px",
                maxHeight: "128px",
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 128) + "px";
              }}
            />
          </div>
        </div>

        {/* Send/Voice Button */}
        {message.trim() ? (
          <button
            onClick={handleSend}
            disabled={disabled}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoSend className="w-5 h-5" />
          </button>
        ) : (
          <button
            className="p-3 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors"
            disabled={disabled}
          >
            <IoMic className="w-5 h-5 text-blue-600 dark:text-gray-300" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
