import { useEffect, useRef, useState } from "react";
import { IoChatbubbles, IoClose, IoPaperPlane, IoHappy } from "react-icons/io5";

const INITIAL_MESSAGES = [
  {
    role: "bot",
    text: "Hey there! I’m Major’s studio assistant. Ask about features, writing tips, or where to find things—happy to help!",
    timestamp: Date.now(),
  },
];

const SUGGESTED_PROMPTS = [
  "How do I start a new diary entry?",
  "What can I do in the Community tab?",
  "Any tips to keep my writing streak alive?",
  "Where do I track my progress?",
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
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

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

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMessage = {
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
    };

    const botMessage = {
      role: "bot",
      text: getBotReply(trimmed),
      timestamp: Date.now() + 1,
    };

    setMessages((current) => [...current, userMessage, botMessage]);
    setInputValue("");
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
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg">
              <IoChatbubbles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-blue-900 dark:text-white">
                Major Assistant
              </p>
              <p className="text-xs text-blue-500 dark:text-gray-300">
                Ask how to navigate, stay motivated, or polish your writing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Close chatbot"
          >
            <IoClose className="h-5 w-5" />
          </button>
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
            placeholder="Ask about features, workflows, or tips…"
            className="min-h-[2.5rem] flex-1 resize-none bg-transparent text-sm text-blue-900 focus:outline-none dark:text-gray-100"
          />
          <button
            type="button"
            onClick={handleSend}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
            aria-label="Send message"
          >
            <IoPaperPlane className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
