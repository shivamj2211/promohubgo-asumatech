"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  status: "draft" | "live" | "paused" | "completed";
  platform: string;
  objective: string;
  minBudget: number | null;
  maxBudget: number | null;
  createdAt: string;
  influencerCount?: number;
  stats?: { views: number; clicks: number; saves: number; orders: number; spend: number } | null;
};

function Badge({ children, tone = "slate" }: { children: any; tone?: "slate" | "emerald" | "amber" | "red" }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-zinc-900 dark:text-zinc-200",
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}

function currencyINR(v: number) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `₹${v}`;
  }
}

function statusTone(s: Campaign["status"]) {
  if (s === "live") return "emerald";
  if (s === "paused") return "amber";
  if (s === "completed") return "slate";
  return "slate";
}

export default function BrandCampaignsPage() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const meRes = await fetch("/api/me", { cache: "no-store" });
        const meJson = await meRes.json();
        setMe(meJson?.user || meJson);

        const res = await fetch("/api/brand/campaigns", { cache: "no-store" });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "Failed to load campaigns");
        setCampaigns(json.campaigns || []);
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totals = useMemo(() => {
    const base = { campaigns: campaigns.length, live: 0, invites: 0 };
    for (const c of campaigns) {
      if (c.status === "live") base.live++;
      base.invites += c.influencerCount || 0;
    }
    return base;
  }, [campaigns]);

  if (loading) {
    return <div className="p-8 text-sm text-slate-600 dark:text-zinc-400">Loading campaigns...</div>;
  }

  // Simple guard (don’t break flows)
  if (me?.role && me.role !== "BRAND") {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-xl font-extrabold">Brand Campaigns</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            This area is for Brand accounts. Switch to Brand to create and manage campaigns.
          </p>
          <Link href="/myaccount?tab=membership" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Go to Membership
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Campaigns</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
              Create Collabstr-style campaigns, invite creators, and track performance in one place.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="slate">{totals.campaigns} campaigns</Badge>
              <Badge tone="emerald">{totals.live} live</Badge>
              <Badge tone="slate">{totals.invites} invited/linked</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/brand/campaigns/create"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700"
            >
              + Create campaign
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {/* List */}
      {campaigns.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/brand/campaigns/${c.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-extrabold">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                    {c.objective} · {c.platform} · Created {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge tone={statusTone(c.status)}>{c.status.toUpperCase()}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-zinc-900">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Budget</p>
                  <p className="mt-1 font-extrabold">
                    {c.minBudget || c.maxBudget ? `${currencyINR(c.minBudget || 0)}–${currencyINR(c.maxBudget || 0)}` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-zinc-900">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Creators</p>
                  <p className="mt-1 font-extrabold">{c.influencerCount || 0}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-zinc-900">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Orders</p>
                  <p className="mt-1 font-extrabold">{c.stats?.orders ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500 dark:text-zinc-500">
                Tip: Open to invite creators and publish when ready.
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            No campaigns yet. Create your first campaign to start discovering creators.
          </p>
          <Link href="/brand/campaigns/create" className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white">
            Create campaign
          </Link>
        </div>
      )}
    </div>
  );
}
