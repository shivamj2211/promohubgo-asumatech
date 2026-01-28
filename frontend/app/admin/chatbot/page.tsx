"use client";

import { useEffect, useState } from "react";

export default function AdminChatbotPage() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chatbot-config`)
      .then(res => res.json())
      .then(setConfig);
  }, []);

  const save = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chatbot-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    alert("Saved");
  };

  if (!config) return null;

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Chatbot Admin</h1>

      <input
        className="w-full border p-2 rounded"
        value={config.title}
        onChange={e => setConfig({ ...config, title: e.target.value })}
        placeholder="Title"
      />

      <input
        className="w-full border p-2 rounded"
        value={config.subtitle}
        onChange={e => setConfig({ ...config, subtitle: e.target.value })}
        placeholder="Subtitle"
      />

      <textarea
        className="w-full border p-2 rounded"
        rows={4}
        value={config.welcomeMessage}
        onChange={e =>
          setConfig({ ...config, welcomeMessage: e.target.value })
        }
        placeholder="Welcome message"
      />

      <button
        onClick={save}
        className="bg-violet-600 text-white px-4 py-2 rounded"
      >
        Save
      </button>
    </div>
  );
}
