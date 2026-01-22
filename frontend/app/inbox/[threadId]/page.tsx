"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { TopNav } from "@/components/top-nav";

type ThreadItem = {
  id: string;
  otherUser: { id: string; name: string; role?: string | null };
  lastMessage?: string | null;
  lastMessageAt?: string | null;
};

type ThreadInfo = {
  id: string;
  otherUser: { id: string; name: string; role?: string | null };
};

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  pending?: boolean;
};

function formatTime(input?: string | null) {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function ThreadPage() {
  const params = useParams();
  const threadId = useMemo(() => String(params?.threadId || ""), [params]);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [showThreads, setShowThreads] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!threadId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [meRes, threadsRes, threadRes] = await Promise.all([
          apiFetch("/api/me"),
          apiFetch("/api/threads"),
          apiFetch(`/api/threads/${threadId}`),
        ]);
        if (!active) return;
        const currentUserId = meRes?.user?.id || null;
        const threadItems = Array.isArray(threadsRes?.data) ? threadsRes.data : [];
        const detail = threadRes?.data || null;
        setMeId(currentUserId);
        setThreads(threadItems);
        setThread(detail?.thread || null);
        setMessages(Array.isArray(detail?.messages) ? detail.messages : []);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load messages");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage() {
    if (!text.trim() || !threadId) return;
    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: meId || "me",
      body: text.trim(),
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setSending(true);
    try {
      const res = await apiFetch(`/api/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: optimistic.body }),
      });
      const sent = res?.data;
      if (sent?.id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, ...sent, pending: false } : msg))
        );
      }
    } catch (e: any) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setError(e?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const activeThread =
    thread || threads.find((item) => item.id === threadId) || null;

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <TopNav />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Conversation</p>
            <h1 className="text-xl font-extrabold">
              {activeThread?.otherUser?.name || "Chat"}
            </h1>
            {activeThread?.otherUser?.role ? (
              <p className="text-xs text-slate-500">{activeThread.otherUser.role}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowThreads((prev) => !prev)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900 lg:hidden"
            >
              Threads
            </button>
            <Link
              href="/inbox"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside
            className={`rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${
              showThreads ? "block" : "hidden"
            } lg:block`}
          >
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
              Threads
            </div>
            <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-200 dark:divide-zinc-800">
              {threads.map((item) => (
                <Link
                  key={item.id}
                  href={`/inbox/${item.id}`}
                  onClick={() => setShowThreads(false)}
                  className={`block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-zinc-900 ${
                    item.id === threadId ? "bg-slate-50 dark:bg-zinc-900" : ""
                  }`}
                >
                  <div className="font-semibold truncate">{item.otherUser.name}</div>
                  <div className="text-xs text-slate-500 dark:text-zinc-500 truncate">
                    {item.lastMessage || "No messages yet"}
                  </div>
                </Link>
              ))}
              {!threads.length ? (
                <div className="p-4 text-xs text-slate-500 dark:text-zinc-400">
                  No conversations yet.
                </div>
              ) : null}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {loading ? (
              <div className="p-6 text-sm text-slate-500 dark:text-zinc-400">
                Loading messages...
              </div>
            ) : error ? (
              <div className="p-6 text-sm text-rose-600">{error}</div>
            ) : (
              <div className="h-[60vh] overflow-y-auto px-4 py-6 space-y-4">
                {messages.map((msg) => {
                  const mine = msg.senderId === meId;
                  return (
                    <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          mine
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-900 dark:bg-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <div className="mt-2 text-[10px] opacity-70">
                          {msg.pending ? "Sending..." : formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-zinc-800 px-4 py-4">
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !text.trim()}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
              {error && !loading ? (
                <p className="mt-2 text-xs text-rose-600">{error}</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
