// FILE: app/myaccount/boosters/page.tsx
// A clean "Booster Hub" UI page (Next.js App Router + TS + Tailwind)

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type BoosterStatus = "locked" | "available" | "completed";

type BoosterItem = {
  key: string;
  title: string;
  description: string;
  category: string;
  points: number;
  status: BoosterStatus;
  completedAt?: string | null;
  meta?: any;
};

type BoosterSummary = {
  totalPoints: number;
  earnedPoints: number;
  percent: number;
  boostLevel: string;
  boosters: BoosterItem[];
};
type SocialConnectionStatus = {
  platform: string;
  verified: boolean;
  stats?: any;
  createdAt?: string;
  lastFetchedAt?: string | null;
  fetchStatus?: string | null;
  errorMessage?: string | null;
};

const BOOSTER_UI: Record<string, { ctaLabel: string; hint?: string; href?: string }> = {
  "connect-instagram": {
    ctaLabel: "Connect",
    hint: "Verified accounts rank higher in search.",
  },
  "connect-youtube": {
    ctaLabel: "Connect",
    hint: "Recommended if you post Shorts or long videos.",
  },
  portfolio: {
    ctaLabel: "Add Samples",
    hint: "Profiles with samples get faster shortlisting.",
  },
  niche: {
    ctaLabel: "Edit",
    hint: "Primary niche carries highest search weight.",
    href: "/account#categories-section",
  },
  "content-types": {
    ctaLabel: "Add",
    href: "/account#description-section",
  },
  "audience-geo": {
    ctaLabel: "Add",
    href: "/location",
  },
  "audience-age": {
    ctaLabel: "Add",
  },
  "brand-exp": {
    ctaLabel: "Add",
  },
  invoice: {
    ctaLabel: "Add",
    hint: "Strong booster for high-budget deals.",
  },
  "avg-performance": {
    ctaLabel: "Add",
  },
  "response-time": {
    ctaLabel: "Edit",
  },
  "posting-consistency": {
    ctaLabel: "Add",
  },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function statusStyles(status: BoosterStatus) {
  switch (status) {
    case "completed":
      return {
        pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        card: "border-emerald-200/70 bg-white",
        dot: "bg-emerald-500",
      };
    case "available":
      return {
        pill: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
        card: "border-slate-200 bg-white",
        dot: "bg-indigo-500",
      };
    case "locked":
    default:
      return {
        pill: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        card: "border-slate-200 bg-slate-50",
        dot: "bg-slate-400",
      };
  }
}

function boostLevelFromPercent(p: number) {
  if (p >= 90) return { label: "Elite Boost", color: "text-emerald-700", bg: "bg-emerald-50 ring-emerald-200" };
  if (p >= 70) return { label: "High Boost", color: "text-indigo-700", bg: "bg-indigo-50 ring-indigo-200" };
  if (p >= 40) return { label: "Medium Boost", color: "text-amber-700", bg: "bg-amber-50 ring-amber-200" };
  return { label: "Starter Boost", color: "text-slate-700", bg: "bg-slate-100 ring-slate-200" };
}

function groupByCategory(items: BoosterItem[]) {
  const map = new Map<string, BoosterItem[]>();
  for (const b of items) {
    const arr = map.get(b.category) ?? [];
    arr.push(b);
    map.set(b.category, arr);
  }
  return Array.from(map.entries());
}

export default function BoosterHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<BoosterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeBooster, setActiveBooster] = useState<BoosterItem | null>(null);
  const [note, setNote] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [connections, setConnections] = useState<SocialConnectionStatus[]>([]);

  function loadSummary() {
    let active = true;
    setLoading(true);
    apiFetch("/api/boosters/summary")
      .then((res) => {
        if (!active) return;
        setData(res as BoosterSummary);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Failed to load boosters.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }

  async function loadConnections() {
    try {
      const res = await apiFetch("/api/social/status");
      setConnections(Array.isArray(res?.connections) ? res.connections : []);
    } catch {
      setConnections([]);
    }
  }

  useEffect(() => {
    const cleanup = loadSummary();
    loadConnections();
    return cleanup;
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected) {
      setSuccess(`Connected ${connected}. Verified badge added.`);
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [searchParams]);

  const boosters = data?.boosters ?? [];
  const totalPoints = data?.totalPoints ?? 0;
  const earnedPoints = data?.earnedPoints ?? 0;
  const completedCount = boosters.filter((b) => b.status === "completed").length;
  const percent = clamp(data?.percent ?? 0, 0, 100);
  const level = boostLevelFromPercent(percent);
  const levelLabel = data?.boostLevel || level.label;

  const grouped = useMemo(() => groupByCategory(boosters), [boosters]);

  async function handleComplete() {
    if (!activeBooster) return;
    if (activeBooster.key === "portfolio" && !linkInput.trim()) {
      setError("Please add a link to your best work.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/boosters/complete", {
        method: "POST",
        body: JSON.stringify({
          boosterKey: activeBooster.key,
          meta:
            activeBooster.key === "portfolio"
              ? { links: [linkInput.trim()] }
              : activeBooster.key.startsWith("connect-") && manualMode
              ? { manualLink: linkInput.trim() }
              : note.trim()
              ? { note: note.trim() }
              : undefined,
        }),
      });
      setModalOpen(false);
      setActiveBooster(null);
      setNote("");
      setLinkInput("");
      setManualMode(false);
      loadSummary();
      loadConnections();
      setSuccess(`Thanks! +${activeBooster.points} pts added.`);
      setTimeout(() => setSuccess(null), 2500);
    } catch (e: any) {
      setError(e?.message || "Failed to complete booster.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh(platform: string) {
    try {
      await apiFetch("/api/social/refresh", {
        method: "POST",
        body: JSON.stringify({ platform }),
      });
      loadConnections();
    } catch (e: any) {
      setError(e?.message || "Failed to refresh stats.");
    }
  }

  function handleAction(booster: BoosterItem) {
    const ui = BOOSTER_UI[booster.key];
    if (ui?.href) {
      router.push(ui.href);
      return;
    }
    setActiveBooster(booster);
    setNote(String(booster.meta?.note || ""));
    const existingLink = Array.isArray(booster.meta?.links) ? booster.meta.links[0] : "";
    setLinkInput(String(existingLink || ""));
    setManualMode(false);
    setModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Boosters</h1>
              <p className="mt-1 text-sm text-slate-600">
                Complete boosters to rank higher in search, build trust, and close deals faster.
              </p>
            </div>

            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1 ${level.bg} ${level.color}`}>
              <span className="h-2 w-2 rounded-full bg-current opacity-70" />
              <span className="font-medium">{levelLabel}</span>
              <span className="text-slate-500">-</span>
              <span className="text-slate-700">{percent}% complete</span>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard title="Booster Score" value={`${earnedPoints}/${totalPoints}`} sub={`Earned points`} />
            <SummaryCard title="Completion" value={`${percent}%`} sub={`${completedCount}/${boosters.length} boosters completed`} />
            <SummaryCard title="Search Boost" value={percent >= 70 ? "High" : percent >= 40 ? "Medium" : "Low"} sub="Higher = more discovery" />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Progress</span>
              <span>{percent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${percent}%` }} />
            </div>

            <div className="mt-4 rounded-xl border bg-slate-900 px-4 py-3 text-white">
              <div className="text-sm font-medium">Pro Tip</div>
              <div className="mt-1 text-sm text-white/80">
                Completing this section can increase your chances of getting deals and help you charge up to{" "}
                <span className="font-semibold text-white">70% higher pricing</span> because brands see clearer capability + proof.
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Verified Social Analytics</div>
            <div className="mt-3 space-y-2 text-sm">
              {connections.length ? (
                connections.map((conn) => (
                  <div key={conn.platform} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                    <div className="font-medium capitalize">
                      {conn.platform} {conn.verified ? "✅" : ""}
                    </div>
                    <div className="text-xs text-slate-500">
                      {conn.lastFetchedAt ? `Updated ${new Date(conn.lastFetchedAt).toLocaleDateString()}` : "Not updated"}
                      {conn.fetchStatus && conn.fetchStatus !== "OK" ? ` • ${conn.fetchStatus}` : ""}
                    </div>
                    <button
                      onClick={() => handleRefresh(conn.platform)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold"
                    >
                      Refresh
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">No connections yet.</div>
              )}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Unlockable metrics: followers, views, engagement, audience insights, and more (based on permissions).
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">All Boosters</h2>
          <div className="text-sm text-slate-600">
            Tip: Start with <span className="font-medium text-slate-900">Connect Social</span> +{" "}
            <span className="font-medium text-slate-900">Portfolio</span>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-sm text-slate-500">Loading boosters...</div>
        ) : (
          <div className="mt-4 space-y-8">
            {grouped.map(([cat, boostersInCat]) => (
              <section key={cat}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{cat}</h3>
                  <CategoryMiniStat boosters={boostersInCat} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-1 lg:grid-cols-1">
                  {boostersInCat.map((b) => (
                    <BoosterCard key={b.key} booster={b} onAction={handleAction} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {modalOpen && activeBooster ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{activeBooster.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {activeBooster.key === "portfolio"
                ? "Add a link to your best work. We'll use it to show your samples in profile."
                : activeBooster.key === "connect-instagram"
                ? "Connect your Instagram via Meta OAuth to verify and fetch followers/insights."
                : activeBooster.key === "connect-youtube"
                ? "Connect your YouTube via Google OAuth to verify and fetch subscribers/views."
                : "Add a quick note to complete this booster now. You can update it later."}
            </p>
            {activeBooster.key === "connect-instagram" || activeBooster.key === "connect-youtube" ? (
              <div className="mt-4 space-y-3">
                <ol className="list-decimal pl-5 text-sm text-slate-600">
                  <li>Click connect and approve permissions.</li>
                  <li>We fetch followers/views and mark you Verified.</li>
                  <li>You’ll return here with points applied.</li>
                </ol>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const url =
                        activeBooster.key === "connect-instagram"
                          ? "/api/oauth/meta/start?platform=instagram"
                          : "/api/oauth/google/start?platform=youtube";
                      window.location.href = url;
                    }}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {activeBooster.key === "connect-instagram" ? "Connect Instagram" : "Connect YouTube"}
                  </button>
                  <button
                    onClick={() => setManualMode((v) => !v)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    {manualMode ? "Use OAuth instead" : "Manual link"}
                  </button>
                </div>
                {manualMode ? (
                  <input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="Paste your profile link"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                ) : null}
              </div>
            ) : activeBooster.key === "portfolio" ? (
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Paste portfolio link (Drive, Behance, YouTube, Instagram, etc.)"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            ) : (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Optional details..."
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setActiveBooster(null);
                  setNote("");
                  setLinkInput("");
                  setManualMode(false);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              {activeBooster.key.startsWith("connect-") ? (
                manualMode ? (
                  <button
                    onClick={handleComplete}
                    disabled={saving || !linkInput.trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save & Complete"}
                  </button>
                ) : null
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : activeBooster.status === "completed" ? "Update" : "Save & Complete"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{sub}</div>
    </div>
  );
}

function CategoryMiniStat({ boosters }: { boosters: BoosterItem[] }) {
  const total = boosters.reduce((s, b) => s + b.points, 0);
  const earned = boosters.filter((b) => b.status === "completed").reduce((s, b) => s + b.points, 0);
  const pct = clamp(Math.round((earned / total) * 100), 0, 100);
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
        {earned}/{total} pts
      </span>
      <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">{pct}%</span>
    </div>
  );
}

function BoosterCard({ booster, onAction }: { booster: BoosterItem; onAction: (booster: BoosterItem) => void }) {
  const s = statusStyles(booster.status);
  const ui = BOOSTER_UI[booster.key] || { ctaLabel: booster.status === "completed" ? "Edit" : "Add" };

  const disabled = booster.status === "locked";
  const btnBase =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-900/20";
  const btnEnabled = "bg-slate-900 text-white hover:bg-slate-800";
  const btnDisabled = "bg-slate-200 text-slate-500 cursor-not-allowed";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${s.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            <h4 className="truncate text-base font-semibold text-slate-900">{booster.title}</h4>
          </div>
          <p className="mt-1 text-sm text-slate-600">{booster.description}</p>
        </div>

        <div className="shrink-0 text-right">
          <div className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${s.pill}`}>
            {booster.status === "completed" ? "Completed" : booster.status === "available" ? "Available" : "Locked"}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">+{booster.points} pts</div>
        </div>
      </div>

      {ui.hint ? (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
          Tip: {ui.hint}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Impact:{" "}
          <span className="font-medium text-slate-700">
            {booster.category === "Verification"
              ? "Search + Trust"
              : booster.category === "Performance"
              ? "Search + Pricing"
              : booster.category === "Trust"
              ? "Close Deals Faster"
              : booster.category === "Audience"
              ? "Better Brand Match"
              : "Discovery"}
          </span>
        </div>

        <button
          className={`${btnBase} ${disabled ? btnDisabled : btnEnabled}`}
          disabled={disabled}
          onClick={() => onAction(booster)}
        >
          {ui.ctaLabel}
        </button>
      </div>
    </div>
  );
}
