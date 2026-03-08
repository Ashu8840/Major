import { useEffect, useRef, useState } from "react";
import {
  IoChatbubbles,
  IoClose,
  IoPaperPlane,
  IoHappy,
  IoRefresh,
} from "react-icons/io5";
import {
  sendChatbotMessage,
  checkChatbotHealth,
  resetChatbotConversation,
} from "../utils/api";
import toast from "react-hot-toast";

const INITIAL_MESSAGES = [
  {
    role: "bot",
    text: "Hi! I'm the SoulSpace AI assistant. I can help you with journals, community features, chat, settings, and more. What would you like to know?",
    timestamp: Date.now(),
  },
];

const SUGGESTED_PROMPTS = [
  "How do I create a diary entry?",
  "How do I enable dark mode?",
  "What is the community section?",
  "How do I change my password?",
];

export default function ChatbotWidget({ isOpen, onClose, isMobile }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [botStatus, setBotStatus] = useState({ online: false, checking: true });
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Generate a unique user ID for this session
  const [userId] = useState(() => {
    const stored = localStorage.getItem("chatbot_user_id");
    if (stored) return stored;
    const newId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    localStorage.setItem("chatbot_user_id", newId);
    return newId;
  });

  // Check bot health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkChatbotHealth();
        setBotStatus({
          online: health.status === "healthy" && health.model_loaded,
          checking: false,
        });
      } catch (error) {
        setBotStatus({ online: false, checking: false });
      }
    };

    if (isOpen) {
      checkHealth();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    const focusTimeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 200);

    return () => clearTimeout(focusTimeout);
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (!isOpen || !isMobile) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (isOpen) {
      setMessages((current) =>
        current.length === 0 ? INITIAL_MESSAGES : current,
      );
    } else {
      setInputValue("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isOpen, messages]);

  if (!isOpen) {
    return null;
  }

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage = {
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
    };

    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      if (botStatus.online) {
        const response = await sendChatbotMessage(trimmed, userId, {
          temperature: 0.7,
          maxLength: 200,
        });

        const botMessage = {
          role: "bot",
          text:
            response.response ||
            response.answer ||
            "I couldn't find an answer. Could you try rephrasing?",
          timestamp: Date.now(),
        };

        setMessages((current) => [...current, botMessage]);
      } else {
        const botMessage = {
          role: "bot",
          text: "The AI server is currently offline. Please try again in a moment.",
          timestamp: Date.now(),
        };
        setMessages((current) => [...current, botMessage]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);

      const fallbackMessage = {
        role: "bot",
        text: "I'm having trouble connecting right now. Please try again shortly.",
        timestamp: Date.now(),
      };

      setMessages((current) => [...current, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConversation = async () => {
    try {
      await resetChatbotConversation(userId);
      setMessages(INITIAL_MESSAGES);
      toast.success("Conversation reset!");
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("Failed to reset conversation");
    }
  };

  const handlePromptClick = (prompt) => {
    setInputValue(prompt);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const containerClasses = isMobile
    ? "fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900"
    : "fixed inset-0 z-50 flex justify-end p-4 sm:p-6";

  const panelClasses = isMobile
    ? "flex h-full flex-col"
    : "flex h-[34rem] w-full max-w-lg flex-col rounded-3xl border border-blue-100 bg-white shadow-2xl backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900";

  return (
    <div className={containerClasses}>
      {!isMobile && (
        <div
          className="absolute inset-0 z-10 cursor-pointer bg-blue-900/10"
          onClick={onClose}
        />
      )}

      <div
        className={`${panelClasses} ${
          isMobile ? "px-4 pt-5" : "pointer-events-auto relative z-20 p-5"
        }`}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg">
              <IoChatbubbles className="h-5 w-5" />
              {!botStatus.checking && (
                <span
                  className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white ${
                    botStatus.online ? "bg-green-500" : "bg-red-500"
                  }`}
                  title={botStatus.online ? "AI Online" : "AI Offline"}
                />
              )}
            </span>
            <div>
              <p className="text-base font-semibold text-blue-900 dark:text-white">
                SoulSpace AI Assistant
              </p>
              <p className="text-xs text-blue-500 dark:text-gray-300">
                {botStatus.checking
                  ? "Checking connection..."
                  : botStatus.online
                    ? "RAG-powered • Ready to help"
                    : "Offline • Trying to connect..."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetConversation}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-gray-800 dark:text-gray-200"
              aria-label="Reset conversation"
              title="Reset conversation"
            >
              <IoRefresh className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-gray-800 dark:text-gray-200"
              aria-label="Close chatbot"
            >
              <IoClose className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="mt-5 flex-1 scrollable hide-scrollbar rounded-3xl border border-blue-100 bg-white/70 px-4 py-5 shadow-inner dark:border-gray-700 dark:bg-gray-900/70"
        >
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-900 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl bg-blue-50 px-4 py-3 text-sm dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]"></span>
                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.15s]"></span>
                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600"></span>
                    </div>
                    <span className="text-xs text-blue-500 dark:text-gray-400">
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handlePromptClick(prompt)}
              className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-left text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-blue-200"
            >
              <IoHappy className="h-4 w-4" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
              if (event.key === "Escape") {
                onClose();
              }
            }}
            placeholder={
              botStatus.online
                ? "Ask me anything about SoulSpace..."
                : "Chatbot is offline..."
            }
            disabled={!botStatus.online || isLoading}
            className="min-h-[2.5rem] flex-1 resize-none bg-transparent text-sm text-blue-900 focus:outline-none disabled:opacity-50 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!botStatus.online || isLoading || !inputValue.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <IoPaperPlane className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
