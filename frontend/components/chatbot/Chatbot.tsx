"use client";

import { useState } from "react";
import ChatbotPanel from "./ChatbotPanel";
import { MessageCircle, X } from "lucide-react";

export default function Chatbot() {
  const [open, setOpen] = useState(false);

  const toggleChatbot = () => {
    setOpen(prev => !prev);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleChatbot}
        className="
          fixed bottom-6 right-6 z-50
          h-14 w-14 rounded-full
          bg-gradient-to-br from-violet-600 to-indigo-600
          text-white
          shadow-lg shadow-violet-500/40
          flex items-center justify-center
          hover:scale-105 active:scale-95
          transition-all duration-200
        "
        aria-label="Toggle chatbot"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Panel */}
      {open && <ChatbotPanel onClose={() => setOpen(false)} />}
    </>
  );
}
