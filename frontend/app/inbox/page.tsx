"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { TopNav } from "@/components/top-nav";

type ThreadItem = {
  id: string;
  otherUser: { id: string; name: string; role?: string | null };
  lastMessage?: string | null;
  lastMessageAt?: string | null;
};

function formatTime(input?: string | null) {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function InboxPage() {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch("/api/threads");
        if (!active) return;
        const items = Array.isArray(res?.data) ? res.data : [];
        setThreads(items);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load inbox");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <TopNav />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Inbox</h1>
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              Your recent contact threads
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {loading ? (
            <div className="p-6 text-sm text-slate-500 dark:text-zinc-400">Loading threads...</div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600">{error}</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 dark:text-zinc-400">
              No conversations yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-zinc-800">
              {threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/inbox/${thread.id}`}
                  className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{thread.otherUser.name}</span>
                      {thread.otherUser.role ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
                          {thread.otherUser.role}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400 truncate">
                      {thread.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-zinc-500">
                    {formatTime(thread.lastMessageAt)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
