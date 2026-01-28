"use client";

import { useEffect, useState, useRef } from "react";
import ChatbotActions from "./ChatbotActions";
import { X, Maximize2, ChevronUp } from "lucide-react";

type Message = {
  from: "bot" | "user";
  text: string;
};

export default function ChatbotPanel({ onClose }: { onClose: () => void }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text:
        "Hi 👋 I’m your PromoHub assistant. Ask me anything about onboarding, packages, or creators.",
    },
  ]);
  const [scrolled, setScrolled] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // NEW: control quick actions visibility
  const [showActions, setShowActions] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* ------------------ fetch admin config ------------------ */
  useEffect(() => {
  inputRef.current?.focus();
}, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chatbot-config`)
      .then(res => res.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  /* ------------------ auto scroll ------------------ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ------------------ send message ------------------ */
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => {
  const nextMessages: Message[] = [
    ...prev,
    { from: "user" as const, text: userMessage },
  ];

  const userMessages = nextMessages.filter(
    m => m.from === "user"
  ).length;

  if (userMessages >= 2) {
    setShowActions(false); // AUTO-HIDE after 2 user messages
  }

  return nextMessages;
});


   setLoading(true);

    // HIDE quick actions after first user message
    setShowActions(false);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chatbot/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage }),
        }
      );

      const data = await res.json();

      setMessages(prev => [...prev, { from: "bot" as const, text: data.reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { from: "bot", text: "Something went wrong. Please try again 🙂" },
      ]);
    }

    setLoading(false);
  };

  /* ------------------ close with animation ------------------ */
  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 200);
  };

  return (
    <div
      className={`
        fixed z-50
        rounded-2xl overflow-hidden
        border shadow-2xl
        transition-all duration-300 ease-in-out
        bg-white text-gray-900 border-gray-200
        dark:bg-[#0B0F1A] dark:text-gray-100 dark:border-gray-700
        ${fullscreen
          ? "inset-0 rounded-none"
          : "bottom-24 right-6 w-[360px] h-[560px]"
        }
        ${closing ? "animate-chatbot-out" : "animate-chatbot-in"}
      `}
    >
      {/* ================= HEADER ================= */}
      <div className={`
        sticky top-0 z-10
        flex items-center justify-between px-4 py-3
        bg-gradient-to-r from-violet-600 to-indigo-600
        dark:from-violet-700 dark:to-indigo-800
        text-white ${scrolled ? "shadow-md" : ""}
    `}
      >
        <div>
          <p className="font-semibold text-sm">
            {config?.title || "PromoHub Assistant"}
          </p>
          <p className="text-xs opacity-80">
            {config?.subtitle || "Helping creators & brands grow 🚀"}
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setFullscreen(!fullscreen)}>
            <Maximize2 size={16} />
          </button>
          <button onClick={handleClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="flex flex-col h-full
    bg-gray-50 dark:bg-[#0F1526]
    text-[13px] leading-[1.4]">

        {/* CHAT AREA */}
        <div className="flex-1 p-4 pt-14 space-y-3 overflow-y-auto" onScroll={e => setScrolled(e.currentTarget.scrollTop > 8)}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.from === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`
                  max-w-[260px] px-3 py-2 rounded-2xl text-[13px] animate-[fadeIn_0.2s_ease-out]
                  ${
                    m.from === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-white border border-gray-200 text-gray-800 dark:bg-[#151B2C] dark:border-gray-700 dark:text-gray-200"
                  }
                `}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-1 pl-2">
  <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
  <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
  <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" />
</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* QUICK ACTIONS (COMPACT + COLLAPSIBLE) */}
        {showActions ? (
          <div
  className={`
    transition-all duration-200
    ${
      showActions
        ? "opacity-100 translate-y-0"
        : "opacity-0 translate-y-2 pointer-events-none"
    }
  `}
>
  <ChatbotActions compact />
</div>

        ) : (
          <button
            onClick={() => setShowActions(true)}
            className="
              mx-auto mb-2 flex items-center gap-1
              text-xs text-violet-600 hover:underline
            "
          >
            <ChevronUp size={14} />
            Quick actions
          </button>
        )}

        {/* INPUT */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-700" />

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
         
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Ask something…"
            className="
              flex-1 rounded-xl px-3 py-2 text-sm
              bg-white dark:bg-[#151B2C]
              border border-gray-200 dark:border-gray-700
              outline-none
              focus:border-violet-500 focus:ring-1 focus:ring-violet-500
            "
          />
          <button
  onClick={sendMessage}
  disabled={!input.trim()}
  className={`
    px-4 rounded-xl transition
    ${
      input.trim()
        ? "bg-violet-600 text-white hover:bg-violet-700"
        : "bg-gray-300 text-gray-500 cursor-not-allowed"
    }
  `}
>
  Send
</button>

        </div>
      </div>
    </div>
  );
}
