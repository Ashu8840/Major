import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

const ChatWindow = ({ chat, messages, currentUserId, isLoading = false }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-blue-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-blue-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-blue-900 dark:text-white mb-2">
            Welcome to Chat
          </h3>
          <p className="text-blue-500 dark:text-gray-400">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col bg-blue-50 dark:bg-gray-900"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        maxHeight: "calc(100vh - 140px)",
      }}
    >
      <div
        className="flex-1 scrollable p-4 space-y-1"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`flex ${
                  index % 2 === 0 ? "justify-start" : "justify-end"
                }`}
              >
                <div className="max-w-xs lg:max-w-md h-16 bg-white/60 dark:bg-gray-800/60 rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-blue-500 dark:text-gray-400 mb-2">
                No messages yet
              </p>
              <p className="text-sm text-blue-400 dark:text-gray-500">
                Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <span className="bg-white dark:bg-gray-700 text-blue-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full border border-blue-200 dark:border-gray-600">
                Today
              </span>
            </div>

            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                message={message}
                isOwn={message.senderId === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
