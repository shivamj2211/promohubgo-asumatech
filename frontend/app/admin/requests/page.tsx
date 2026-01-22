"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ReqRow = {
  id: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  listingId?: string | null;
  handledAt?: string | null;
  fromUser: { id: string; name: string; role?: string | null };
  toUser: { id: string; name: string; role?: string | null };
};

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/contact-requests?status=pending`, { method: "GET" });
      if (!res?.ok) throw new Error(res?.error || "Failed to load");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function mark(id: string, status: "accepted" | "rejected") {
    try {
      const res = await apiFetch(`/api/admin/contact-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res?.ok) throw new Error(res?.error || "Failed");
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-zinc-100">
            Requests Inbox
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Contact requests stored in DB
          </p>
        </div>

        <button
          onClick={load}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 dark:border-zinc-800 dark:text-zinc-100">
          {loading ? "Loading..." : `Pending: ${rows.length}`}
        </div>

        {err ? (
          <div className="p-4 text-sm font-semibold text-rose-700 dark:text-rose-300">
            {err}
          </div>
        ) : rows.length === 0 && !loading ? (
          <div className="p-6 text-sm text-slate-600 dark:text-zinc-400">
            No requests yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-zinc-800">
            {rows.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          r.status === "pending"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                            : r.status === "accepted"
                            ? "bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200"
                            : "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200"
                        }`}
                      >
                        {r.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-500">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-slate-700 dark:text-zinc-300">
                      <div className="break-all">
                        <span className="font-bold">From:</span> {r.fromUser.name} ({r.fromUser.id})
                      </div>
                      <div className="break-all">
                        <span className="font-bold">To:</span> {r.toUser.name} ({r.toUser.id})
                      </div>
                      {r.listingId ? (
                        <div className="break-all">
                          <span className="font-bold">Listing:</span> {r.listingId}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-100">
                      {r.message}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
                    <button
                      onClick={() => mark(r.id, "accepted")}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => mark(r.id, "rejected")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
