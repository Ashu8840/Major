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
    text: "Hey there! I'm Major's AI assistant powered by DialoGPT. I can help with diary writing, journaling tips, creative prompts, and more. What would you like to talk about?",
    timestamp: Date.now(),
  },
];

const SUGGESTED_PROMPTS = [
  "How can I start journaling daily?",
  "Give me a creative writing prompt",
  "Tips for overcoming writer's block",
  "How to make my diary entries more meaningful?",
];

const FAQ_RESPONSES = [
  {
    question: "How do I start a new diary entry?",
    answer:
      "Click the teal “New Diary Entry” button in the top navigation or open the Diary page and use the + icon. You’ll get mood tracking, AI polishing, and media attachments in one view.",
    keywords: ["new entry", "start", "diary", "write", "journal"],
  },
  {
    question: "What can I do in the Community tab?",
    answer:
      "Community is your collaborative space—share prompts, host writing circles, respond to others, and discover trending posts curated for your interests.",
    keywords: ["community", "social", "share", "post", "connect"],
  },
  {
    question: "Any tips to keep my writing streak alive?",
    answer:
      "Short bursts count! Set a 5-minute timer, jot a single paragraph, and use the streak reminders in Settings. AI drafting suggestions are great when you’re low on ideas.",
    keywords: ["streak", "habit", "motivation", "tips"],
  },
  {
    question: "Where do I track my progress?",
    answer:
      "Head to Analytics for weekly mood charts, writing time heatmaps, and goal progress. Leaderboard shows how you compare with friends.",
    keywords: ["progress", "analytics", "stats", "track"],
  },
  {
    question: "How do I collaborate with others?",
    answer:
      "Use Community to join themed threads or spin up a private circle. You can also send direct messages and swap drafts inside Circle Chat.",
    keywords: ["collaborate", "friends", "circle", "chat"],
  },
  {
    question: "Can the AI help polish my writing?",
    answer:
      "Absolutely. In any entry, open the AI tools drawer to fix grammar, translate passages, or expand your draft with richer detail.",
    keywords: ["ai", "polish", "grammar", "translate", "improve"],
  },
  {
    question: "How do I upgrade or manage billing?",
    answer:
      "Visit the Upgrade page for plan perks. Billing history lives under Settings → Membership, and you can switch tiers anytime.",
    keywords: ["upgrade", "billing", "membership", "pricing"],
  },
];

const FALLBACK_RESPONSES = [
  "I’m piecing that together—could you try rephrasing or be a touch more specific?",
  "I haven’t learned that trick yet. Maybe check Analytics or Settings while I keep learning?",
  "That’s a great question! I can help with navigation, writing workflows, and feature tips if you can point me in the right direction.",
];

const getBotReply = (message) => {
  const normalized = message.toLowerCase();
  const gratitude = ["thanks", "thank", "appreciate", "thank you"];
  if (gratitude.some((word) => normalized.includes(word))) {
    return "Anytime! Keep creating—your stories matter.";
  }

  const matched = FAQ_RESPONSES.reduce(
    (best, response) => {
      const score = response.keywords.reduce(
        (accumulator, keyword) =>
          normalized.includes(keyword) ? accumulator + 1 : accumulator,
        0
      );
      if (score > best.score) {
        return { item: response, score };
      }
      return best;
    },
    { item: null, score: 0 }
  );

  if (matched.item) {
    return `${matched.item.answer}`;
  }

  const fallbackIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  return FALLBACK_RESPONSES[fallbackIndex];
};

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
        current.length === 0 ? INITIAL_MESSAGES : current
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

  // Helper function to check if question is about journaling/writing
  const isJournalingQuestion = (text) => {
    const keywords = [
      "journal",
      "diary",
      "writing",
      "write",
      "entry",
      "entries",
      "prompt",
      "creative",
      "meaningful",
      "daily",
      "habit",
      "streak",
      "mood",
      "feelings",
      "thoughts",
      "reflection",
      "gratitude",
      "productivity",
      "goals",
      "track",
      "document",
      "record",
    ];
    const lowerText = text.toLowerCase();
    return keywords.some((keyword) => lowerText.includes(keyword));
  };

  // Enhanced responses for journaling topics
  const getEnhancedResponse = (message) => {
    const lowerMsg = message.toLowerCase();

    // Journaling habits
    if (lowerMsg.includes("start") && lowerMsg.includes("journal")) {
      return "Starting a daily journaling habit is easier than you think! Here's my advice:\n\n1. **Start small**: Just 5 minutes a day\n2. **Pick a consistent time**: Morning or before bed works best\n3. **Use prompts**: Questions like 'What am I grateful for?' or 'What did I learn today?'\n4. **Don't worry about perfection**: Your journal is for you, not anyone else\n5. **Use this app**: Track your mood, add photos, and let AI help polish your thoughts!\n\nWhat aspect of journaling interests you most?";
    }

    // Writing prompts
    if (lowerMsg.includes("prompt") || lowerMsg.includes("creative")) {
      const prompts = [
        "Write about a moment today that made you smile, no matter how small.",
        "Describe your ideal day 5 years from now. What does it look, feel, and sound like?",
        "Write a letter to your past self from one year ago. What would you tell them?",
        "If you could have dinner with anyone, living or dead, who would it be and why?",
        "Describe a challenge you overcame this week and what it taught you.",
        "Write about three things you're grateful for today and why they matter.",
        "Imagine your life as a book. What would this chapter be titled?",
      ];
      return prompts[Math.floor(Math.random() * prompts.length)];
    }

    // Meaningful entries
    if (lowerMsg.includes("meaningful") || lowerMsg.includes("better")) {
      return "To make your diary entries more meaningful:\n\n📝 **Be specific**: Instead of 'had a good day', write 'felt energized after morning coffee and finishing that project'\n\n💭 **Add emotions**: Don't just say what happened, describe how you felt\n\n🎯 **Include lessons**: What did you learn? What would you do differently?\n\n📸 **Use media**: Add photos, voice notes, or sketches to capture the full experience\n\n🔄 **Review regularly**: Read past entries to see your growth\n\nWhat would make your entries feel more complete?";
    }

    // Writer's block
    if (lowerMsg.includes("block") || lowerMsg.includes("stuck")) {
      return "Overcoming writer's block:\n\n✨ Try these techniques:\n• Stream of consciousness: Write whatever comes to mind for 5 minutes\n• Answer a random question: 'What made me laugh today?'\n• Describe your surroundings in detail\n• Write about what's blocking you\n• Use voice recording instead of typing\n• Set a tiny goal: Just one sentence\n\nRemember: Any writing is better than no writing!";
    }

    // General encouragement for journaling questions
    if (isJournalingQuestion(message)) {
      return "That's a great journaling question! While I'm learning to give better answers, here are some tips:\n\n• **Be consistent**: Write regularly, even if it's just a few lines\n• **Be honest**: Your journal is your safe space\n• **Experiment**: Try different formats (lists, letters, poems)\n• **Use this app's features**: Mood tracking, AI polish, media attachments\n\nWhat specific aspect would you like to explore?";
    }

    return null; // Let AI handle non-journaling questions
  };

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
      // Check for enhanced responses first
      const enhancedResponse = getEnhancedResponse(trimmed);

      if (enhancedResponse) {
        // Use our curated response for journaling topics
        const botMessage = {
          role: "bot",
          text: enhancedResponse,
          timestamp: Date.now(),
        };
        setMessages((current) => [...current, botMessage]);
      } else if (botStatus.online) {
        // Use AI for general conversation
        try {
          // Add context to help AI understand it's a journaling assistant
          const contextualMessage = isJournalingQuestion(trimmed)
            ? `As a journaling and writing assistant, ${trimmed}`
            : trimmed;

          const response = await sendChatbotMessage(contextualMessage, userId, {
            temperature: 0.8,
            maxLength: 200,
          });

          const botMessage = {
            role: "bot",
            text:
              response.response ||
              "I'm here to help with journaling and writing. Could you rephrase that?",
            timestamp: Date.now(),
          };

          setMessages((current) => [...current, botMessage]);
        } catch (apiError) {
          // If API fails, use enhanced response
          const fallbackResponse =
            getEnhancedResponse(trimmed) ||
            "I'm having trouble connecting right now. Try asking about journaling habits, writing prompts, or making meaningful entries!";

          const botMessage = {
            role: "bot",
            text: fallbackResponse,
            timestamp: Date.now(),
          };
          setMessages((current) => [...current, botMessage]);
        }
      } else {
        // Bot offline - use enhanced responses
        const offlineResponse =
          getEnhancedResponse(trimmed) ||
          "The AI server is offline, but I can still help with journaling questions! Try asking about daily habits, writing prompts, or making meaningful entries.";

        const botMessage = {
          role: "bot",
          text: offlineResponse,
          timestamp: Date.now(),
        };
        setMessages((current) => [...current, botMessage]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);

      const fallbackMessage = {
        role: "bot",
        text: "I'm having trouble right now, but I'm here to help with journaling! Ask me about starting a daily habit, creative prompts, or making entries more meaningful.",
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
                Major AI Assistant
              </p>
              <p className="text-xs text-blue-500 dark:text-gray-300">
                {botStatus.checking
                  ? "Checking connection..."
                  : botStatus.online
                  ? "Powered by DialoGPT • Ready to chat"
                  : "Offline • Start bot server on port 5001"}
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
                ? "Ask me anything about journaling, writing, or life..."
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
