"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function ContactCreator({ params, searchParams }: any) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string>("");
  const [msg, setMsg] = useState("");
  const pkg = searchParams?.pkg ? String(searchParams.pkg) : "";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiFetch(`/api/public/influencers/${params.id}`);
        if (!alive) return;
        setName(data?.influencer?.full_name || "Creator");
      } catch (e) {
        console.error(e);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.id]);

  const submit = (e: any) => {
    e.preventDefault();
    alert("For now this is UI-only. Next step: backend Inquiry table + send email/notification.");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold">
            Contact {loading ? "..." : name}
          </h1>
          <Link className="text-sm font-bold underline" href={`/creator/${params.id}`}>
            Back
          </Link>
        </div>

        <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          {pkg ? (
            <div className="mb-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold dark:bg-zinc-900">
              Selected package: <span className="font-extrabold">{pkg}</span>
            </div>
          ) : null}

          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Your message</label>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Tell the creator what you want (deliverables, timeline, budget, etc.)"
            className="mt-2 min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
          />

          <button
            type="submit"
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
          >
            Send Request
          </button>

          <p className="mt-3 text-xs text-slate-500 dark:text-zinc-500">
            Next step: backend me inquiry store + admin panel me requests list.
          </p>
        </form>
      </div>
    </div>
  );
}
