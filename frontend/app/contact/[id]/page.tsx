"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ContactPage() {
  const params = useParams();
  const router = useRouter();
  const id = useMemo(() => String(params?.id || ""), [params]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | { ok: boolean; text: string }>(null);
  const [toName, setToName] = useState("");

  useEffect(() => {
    let active = true;
    if (!id) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/public/profile/${id}`);
        if (!active) return;
        setToName(res?.user?.name || res?.user?.username || res?.user?.email || "");
      } catch {
        if (active) setToName("");
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function submit() {
    setDone(null);
    if (!id) return setDone({ ok: false, text: "Missing profile id" });
    if (!message.trim()) return setDone({ ok: false, text: "Write a message first" });

    setLoading(true);
    try {
      const res = await apiFetch(`/api/contact/request`, {
        method: "POST",
        body: JSON.stringify({ toUserId: id, message: message.trim() }),
      });

      if (!res?.ok) throw new Error(res?.error || "Failed");
      setDone({ ok: true, text: "Request sent successfully." });
      setMessage("");
    } catch (e: any) {
      setDone({ ok: false, text: e?.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              Contact Request
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400 break-all">
              To: <span className="font-semibold">{toName || id}</span>
            </p>
          </div>

          <button
            onClick={() => router.back()}
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Back
          </button>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Write your message"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />

          {done && (
            <div
              className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                done.ok
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200"
                  : "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200"
              }`}
            >
              {done.text}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              disabled={loading}
              onClick={submit}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
