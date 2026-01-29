"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import InsightsPage from './insights/page';

type ThreadItem = {
  id: string;
  otherUser: { id: string; name: string; role?: string | null };
  lastMessage?: string | null;
  lastMessageAt?: string | null;
};

type Me = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  isPremium?: boolean | null;
};

type OrderItem = {
  id: string;
  status: string;
  listingId: string;
  createdAt: string;
  totalPrice?: number;
  package?: {
    id: string;
    title: string;
    platform: string;
    price: number;
  } | null;
};

type OnboardingStatus = {
  ok: boolean;
  role?: string | null;
  completion?: {
    percent: number;
    completed: number;
    total: number;
  };
  missing?: { key: string; label: string; step: number }[];
  nextStep?: number | null;
};

type CreatorAnalytics = {
  ok: boolean;
  totals?: { views: number; clicks: number; saves: number; orders: number };
  packages?: {
    packageId: string;
    title: string;
    platform: string;
    price: number;
    views: number;
    clicks: number;
    saves: number;
    orders: number;
  }[];
};

type CreatorEarnings = {
  ok: boolean;
  totals?: { gross: number; fees: number; net: number };
  items?: any[];
};

function currencyINR(amount: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount || 0)}`;
  }
}

function safeDiv(a: number, b: number) {
  if (!b) return 0;
  return a / b;
}

function pct(value: number, digits = 1) {
  const v = Number.isFinite(value) ? value : 0;
  return `${(v * 100).toFixed(digits)}%`;
}

function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCSV(value: any) {
  const s = String(value ?? "");
  if (/[\n\r,"]/g.test(s)) return `"${s.replace(/"/g, '""')}"`;

  return s;
}

function MetricCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function BarChartSimple({
  data,
  height = 120,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => (Number.isFinite(d.value) ? d.value : 0)));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold">Engagement breakdown</p>
        <p className="text-xs text-slate-500 dark:text-zinc-500">Totals</p>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {data.map((d) => {
          const v = Number.isFinite(d.value) ? d.value : 0;
          const h = Math.max(2, Math.round((v / max) * height));
          return (
            <div key={d.label} className="flex flex-col items-center gap-2">
              <div className="flex h-[140px] w-full items-end rounded-xl bg-slate-50 px-2 py-2 dark:bg-zinc-900">
                <div
                  className="w-full rounded-lg bg-emerald-600"
                  style={{ height: `${Math.min(height, h)}px` }}
                  aria-label={`${d.label} ${v}`}
                  title={`${d.label}: ${v}`}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{d.label}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{v}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function routeForMissing(role: string | null | undefined, key: string) {
  if (role === "INFLUENCER") {
    if (["gender", "dob", "languages"].includes(key)) return "/profile";
    if (["pincode", "state", "district", "area"].includes(key)) return "/location";
    if (key === "socials") return "/social-media";
    if (["description", "title"].includes(key)) return "/description";
    if (key === "coverImages") return "/cover-images";
    if (key === "portfolio") return "/portfolio";
    if (key === "packages") return "/creator/packages";
    if (key === "boosters") return "/boosters";
  }

  if (role === "BRAND") {
    if (["pincode", "state", "district", "area"].includes(key)) return "/location";
    // Brand onboarding is mostly inside brand pages / account settings.
    if (["hereToDo", "approxBudget", "businessType", "categories", "platforms"].includes(key))
      return "/brand";
  }

  return "/myaccount?tab=settings";
}

export default function MyAccountPage() {
  const searchParams = useSearchParams();
  const active =
    (searchParams.get("tab") as
      | "dashboard"
      | "analytics"
      | "saved-searches"
      | "insights"
      | "orders"
      | "inbox"
      | "settings"
      | "membership"
      | null) || "dashboard";

  const [me, setMe] = useState<Me | null>(null);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [creatorAnalytics, setCreatorAnalytics] = useState<CreatorAnalytics | null>(null);
  const [creatorEarnings, setCreatorEarnings] = useState<CreatorEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activeRequest = true;
    (async () => {
      try {
        setLoading(true);
        const [meRes, threadsRes, ordersRes, onboardingRes] = await Promise.all([
          apiFetch("/api/me"),
          apiFetch("/api/threads"),
          apiFetch("/api/orders/mine"),
          apiFetch("/api/onboarding/status"),
        ]);
        if (!activeRequest) return;
        setMe(meRes?.user || null);
        setThreads(Array.isArray(threadsRes?.data) ? threadsRes.data : []);
        setOrders(Array.isArray(ordersRes) ? ordersRes : []);
        setOnboarding(onboardingRes?.ok ? onboardingRes : null);
      } catch {
        if (activeRequest) {
          setMe(null);
          setThreads([]);
          setOrders([]);
          setOnboarding(null);
        }
      } finally {
        if (activeRequest) setLoading(false);
      }
    })();
    return () => {
      activeRequest = false;
    };
  }, []);

  useEffect(() => {
    let activeRequest = true;
    (async () => {
      if (!me?.role || me.role !== "INFLUENCER") {
        if (activeRequest) {
          setCreatorAnalytics(null);
          setCreatorEarnings(null);
        }
        return;
      }
      try {
        const [analyticsRes, earningsRes] = await Promise.all([
          apiFetch("/api/creator/analytics"),
          apiFetch("/api/creator/earnings"),
        ]);
        if (!activeRequest) return;
        setCreatorAnalytics(analyticsRes?.ok ? analyticsRes : null);
        setCreatorEarnings(earningsRes?.ok ? earningsRes : null);
      } catch {
        if (activeRequest) {
          setCreatorAnalytics(null);
          setCreatorEarnings(null);
        }
      }
    })();

    return () => {
      activeRequest = false;
    };
  }, [me?.role]);

  const recentThreads = useMemo(() => threads.slice(0, 4), [threads]);
  const threadCount = threads.length;

  const orderStats = useMemo(() => {
    const state = {
      total: orders.length,
      pending: 0,
      completed: 0,
      cancelled: 0,
      totalAmount: 0,
      lastOrderAt: null as string | null,
    };
    for (const o of orders) {
      const s = (o.status || "").toLowerCase();
      if (s.includes("complete")) state.completed += 1;
      else if (s.includes("cancel") || s.includes("refund")) state.cancelled += 1;
      else state.pending += 1;
      const amount = typeof o.totalPrice === "number" ? o.totalPrice : o.package?.price || 0;
      state.totalAmount += amount;
      if (!state.lastOrderAt || new Date(o.createdAt).getTime() > new Date(state.lastOrderAt).getTime()) {
        state.lastOrderAt = o.createdAt;
      }
    }
    return state;
  }, [orders]);

  const onboardingPercent = onboarding?.completion?.percent ?? 0;
  const missing = Array.isArray(onboarding?.missing) ? onboarding!.missing! : [];
  const topMissing = missing.slice(0, 4);
  const lastUpdatedText = onboarding?.completion?.total
    ? `${onboarding?.completion?.completed}/${onboarding?.completion?.total} complete`
    : "Not started";

  const creatorTotals = creatorAnalytics?.totals || { views: 0, clicks: 0, saves: 0, orders: 0 };
  const earningsTotals = creatorEarnings?.totals || { gross: 0, fees: 0, net: 0 };
  const topPackages = Array.isArray(creatorAnalytics?.packages) ? creatorAnalytics!.packages!.slice(0, 5) : [];

  return (
    <>
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Loading your account...
        </div>
      ) : null}

      {active === "dashboard" ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold">Dashboard</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                  Welcome back {me?.name || me?.username || "there"}. Track your profile health, activity, and next steps.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                  <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-zinc-800">
                    Role: <span className="font-semibold text-slate-700 dark:text-zinc-200">{me?.role || "N/A"}</span>
                  </span>
                  <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-zinc-800">
                    Membership:{" "}
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">
                      {me?.isPremium ? "Premium" : "Free"}
                    </span>
                  </span>
                  {orderStats.lastOrderAt ? (
                    <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-zinc-800">
                      Last order: <span className="font-semibold text-slate-700 dark:text-zinc-200">{new Date(orderStats.lastOrderAt).toLocaleDateString()}</span>
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/myaccount/saved-searches"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Saved searches
                </Link>
                <Link
                  href="/listings"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  Explore listings
                </Link>
                {me?.role === "INFLUENCER" ? (
                  <Link
                    href="/creator/packages"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    Manage packages
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-slate-400">Profile completion</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500">{lastUpdatedText}</p>
              </div>
              <p className="mt-2 text-3xl font-extrabold">{onboardingPercent}%</p>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-900">
                <div
                  className="h-2 rounded-full bg-emerald-600"
                  style={{ width: `${Math.min(100, Math.max(0, onboardingPercent))}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-500">
                <span>{missing.length ? `${missing.length} pending` : "All done"}</span>
                {missing.length ? (
                  <Link
                    href={routeForMissing(me?.role, missing[0]?.key || "")}
                    className="font-semibold text-emerald-600 hover:underline"
                  >
                    Complete now
                  </Link>
                ) : (
                  <Link href="/profile" className="font-semibold text-emerald-600 hover:underline">
                    View profile
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs uppercase tracking-widest text-slate-400">Conversations</p>
              <p className="mt-2 text-3xl font-extrabold">{threadCount}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
                Keep replies quick to increase your chance of closing deals.
              </p>
              <div className="mt-3">
                <Link href="/myaccount/inbox" className="text-sm font-semibold text-emerald-600 hover:underline">
                  Open inbox
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs uppercase tracking-widest text-slate-400">Orders</p>
              <p className="mt-2 text-3xl font-extrabold">{orderStats.total}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
                {orderStats.pending} pending · {orderStats.completed} completed
              </p>
              <div className="mt-3">
                <Link href="/dashboard/orders" className="text-sm font-semibold text-emerald-600 hover:underline">
                  View orders
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs uppercase tracking-widest text-slate-400">Order value</p>
              <p className="mt-2 text-3xl font-extrabold">{currencyINR(orderStats.totalAmount)}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">Based on your order history.</p>
              <div className="mt-3">
                <Link href="/listings" className="text-sm font-semibold text-emerald-600 hover:underline">
                  Browse more
                </Link>
              </div>
            </div>
          </div>

          {/* Creator-only performance */}
          {me?.role === "INFLUENCER" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-widest text-slate-400">Net earnings</p>
                <p className="mt-2 text-2xl font-extrabold">{currencyINR(earningsTotals.net || 0)}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">After platform fee.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-widest text-slate-400">Views</p>
                <p className="mt-2 text-2xl font-extrabold">{creatorTotals.views}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">Profile + packages.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-widest text-slate-400">Clicks</p>
                <p className="mt-2 text-2xl font-extrabold">{creatorTotals.clicks}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">Intent signal.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-widest text-slate-400">Saves</p>
                <p className="mt-2 text-2xl font-extrabold">{creatorTotals.saves}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">Shortlist count.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-widest text-slate-400">Package orders</p>
                <p className="mt-2 text-2xl font-extrabold">{creatorTotals.orders}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">From analytics events.</p>
              </div>
            </div>
          ) : null}

          {/* Main panels */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Next steps</h2>
                <Link href="/myaccount?tab=settings" className="text-sm font-semibold text-emerald-600 hover:underline">
                  Account settings
                </Link>
              </div>

              {topMissing.length ? (
                <div className="mt-4 space-y-3">
                  {topMissing.map((m) => (
                    <Link
                      key={m.key}
                      href={routeForMissing(me?.role, m.key)}
                      className="block rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{m.label}</span>
                        <span className="text-xs text-slate-500 dark:text-zinc-500">Step {m.step}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                        Tap to complete and improve your profile ranking.
                      </p>
                    </Link>
                  ))}
                  {missing.length > topMissing.length ? (
                    <p className="text-xs text-slate-500 dark:text-zinc-500">
                      +{missing.length - topMissing.length} more pending steps.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
                  Your onboarding looks complete. Keep your profile fresh by updating packages, portfolio, and socials.
                </div>
              )}

              {me?.role === "INFLUENCER" && topPackages.length ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold">Top packages</h3>
                    <Link href="/creator/packages" className="text-sm font-semibold text-emerald-600 hover:underline">
                      View all
                    </Link>
                  </div>
                  <div className="mt-3 space-y-2">
                    {topPackages.map((p) => (
                      <div
                        key={p.packageId}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-zinc-800"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{p.title}</p>
                          <p className="text-xs text-slate-500 dark:text-zinc-500">
                            {p.platform} · {currencyINR(p.price)}
                          </p>
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-zinc-500">
                          <div>{p.views} views</div>
                          <div>{p.orders} orders</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold">Recent messages</h2>
                  <Link href="/myaccount/inbox" className="text-sm font-semibold text-emerald-600 hover:underline">
                    Open inbox
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {recentThreads.length ? (
                    recentThreads.map((thread) => (
                      <div
                        key={thread.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-zinc-800"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{thread.otherUser.name}</p>
                          <p className="text-xs text-slate-500 dark:text-zinc-500 truncate">
                            {thread.lastMessage || "No messages yet"}
                          </p>
                        </div>
                        <Link
                          href={`/myaccount/inbox/${thread.id}`}
                          className="text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-zinc-400">No recent conversations yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold">Recent orders</h2>
                  <Link href="/dashboard/orders" className="text-sm font-semibold text-emerald-600 hover:underline">
                    View orders
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {orders.slice(0, 4).length ? (
                    orders.slice(0, 4).map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-zinc-800"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">
                            {order.package?.title || "Package"} · {order.package?.platform || "platform"}
                          </div>
                          <span className="text-xs text-slate-500">{order.status}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                          <span>#{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className="font-semibold">{currencyINR(typeof order.totalPrice === "number" ? order.totalPrice : order.package?.price || 0)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-zinc-400">No orders yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {active === "analytics" ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">Analytics</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                  Track engagement, conversion and earnings. Download reports to share with brands or keep your own records.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                  <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-zinc-800">
                    Role: <span className="font-semibold text-slate-700 dark:text-zinc-200">{me?.role || "N/A"}</span>
                  </span>
                  <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-zinc-800">
                    Profile: <span className="font-semibold text-slate-700 dark:text-zinc-200">{onboardingPercent}%</span>
                  </span>
                  <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-zinc-800">
                    Membership: <span className="font-semibold text-slate-700 dark:text-zinc-200">{me?.isPremium ? "Premium" : "Free"}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const rows: string[] = [];
                    rows.push(["PromoHubGo Analytics Report"].join(","));
                    rows.push(["Generated At", new Date().toISOString()].map(escapeCSV).join(","));
                    rows.push(["Role", me?.role || ""].map(escapeCSV).join(","));
                    rows.push(["Profile Completion", `${onboardingPercent}%`].map(escapeCSV).join(","));
                    rows.push("");
                    rows.push(["Totals"].join(","));
                    rows.push(["Views", creatorTotals.views].map(escapeCSV).join(","));
                    rows.push(["Clicks", creatorTotals.clicks].map(escapeCSV).join(","));
                    rows.push(["Saves", creatorTotals.saves].map(escapeCSV).join(","));
                    rows.push(["Orders", creatorTotals.orders].map(escapeCSV).join(","));
                    rows.push(["CTR", pct(safeDiv(creatorTotals.clicks, creatorTotals.views))].map(escapeCSV).join(","));
                    rows.push(["Save Rate", pct(safeDiv(creatorTotals.saves, creatorTotals.views))].map(escapeCSV).join(","));
                    rows.push(["Order Conversion", pct(safeDiv(creatorTotals.orders, creatorTotals.clicks))].map(escapeCSV).join(","));
                    rows.push("");
                    rows.push(["Earnings"].join(","));
                    rows.push(["Gross", earningsTotals.gross].map(escapeCSV).join(","));
                    rows.push(["Platform Fee", earningsTotals.fees].map(escapeCSV).join(","));
                    rows.push(["Net", earningsTotals.net].map(escapeCSV).join(","));
                    rows.push("");
                    rows.push(["Packages"].join(","));
                    rows.push(["Title", "Platform", "Price", "Views", "Clicks", "Saves", "Orders"].join(","));
                    for (const p of topPackages) {
                      rows.push(
                        [p.title, p.platform, p.price, p.views, p.clicks, p.saves, p.orders]
                          .map(escapeCSV)
                          .join(",")
                      );
                    }
                    downloadTextFile(`promohubgo-analytics-${new Date().toISOString().slice(0, 10)}.csv`, rows.join("\n"), "text/csv");
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => {
                    const payload = {
                      generatedAt: new Date().toISOString(),
                      role: me?.role,
                      profileCompletion: onboardingPercent,
                      totals: creatorTotals,
                      rates: {
                        ctr: safeDiv(creatorTotals.clicks, creatorTotals.views),
                        saveRate: safeDiv(creatorTotals.saves, creatorTotals.views),
                        orderConversion: safeDiv(creatorTotals.orders, creatorTotals.clicks),
                      },
                      earnings: earningsTotals,
                      packages: topPackages,
                    };
                    downloadTextFile(
                      `promohubgo-analytics-${new Date().toISOString().slice(0, 10)}.json`,
                      JSON.stringify(payload, null, 2),
                      "application/json"
                    );
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  Download JSON
                </button>
              </div>
            </div>
          </div>

          {/* KPI Row */}
          {me?.role === "INFLUENCER" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Views" value={creatorTotals.views} hint="How many times brands viewed your profile/packages." />
              <MetricCard label="Clicks" value={creatorTotals.clicks} hint={`Interest signal · CTR ${pct(safeDiv(creatorTotals.clicks, creatorTotals.views))}`} />
              <MetricCard label="Saves" value={creatorTotals.saves} hint={`Shortlisted · Save rate ${pct(safeDiv(creatorTotals.saves, creatorTotals.views))}`} />
              <MetricCard label="Orders" value={creatorTotals.orders} hint={`Conversion ${pct(safeDiv(creatorTotals.orders, creatorTotals.clicks))} from clicks`} />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Conversations" value={threadCount} hint="How many active message threads you have." />
              <MetricCard label="Orders" value={orderStats.total} hint={`${orderStats.pending} pending · ${orderStats.completed} completed`} />
              <MetricCard label="Order value" value={currencyINR(orderStats.totalAmount)} hint="Total value based on your order history." />
              <MetricCard label="Profile completion" value={`${onboardingPercent}%`} hint={missing.length ? `${missing.length} steps pending` : "All steps complete"} />
            </div>
          )}

          {/* Charts + Insights */}
          {me?.role === "INFLUENCER" ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <BarChartSimple
                  data={[
                    { label: "Views", value: creatorTotals.views },
                    { label: "Clicks", value: creatorTotals.clicks },
                    { label: "Saves", value: creatorTotals.saves },
                    { label: "Orders", value: creatorTotals.orders },
                  ]}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold">Insights</h3>
                  <Link href="/boosters" className="text-sm font-semibold text-emerald-600 hover:underline">
                    Boost profile
                  </Link>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                    <p className="font-semibold">Conversion health</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                      CTR: <span className="font-semibold text-slate-700 dark:text-zinc-200">{pct(safeDiv(creatorTotals.clicks, creatorTotals.views))}</span> ·
                      Save rate: <span className="font-semibold text-slate-700 dark:text-zinc-200">{pct(safeDiv(creatorTotals.saves, creatorTotals.views))}</span> ·
                      Order conversion: <span className="font-semibold text-slate-700 dark:text-zinc-200">{pct(safeDiv(creatorTotals.orders, creatorTotals.clicks))}</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
                      Tip: Improve cover + portfolio, add clear package titles and deliverables to increase CTR and orders.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">Earnings snapshot</p>
                      <Link href="/dashboard/analytics" className="text-xs font-semibold text-emerald-600 hover:underline">
                        Detailed dashboard
                      </Link>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-zinc-900">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">Gross</p>
                        <p className="mt-1 text-sm font-extrabold">{currencyINR(earningsTotals.gross || 0)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-zinc-900">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">Fee</p>
                        <p className="mt-1 text-sm font-extrabold">{currencyINR(earningsTotals.fees || 0)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-zinc-900">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">Net</p>
                        <p className="mt-1 text-sm font-extrabold">{currencyINR(earningsTotals.net || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {missing.length ? (
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                      <p className="font-semibold">Next best actions</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                        Completing onboarding improves search ranking and trust.
                      </p>
                      <div className="mt-3 space-y-2">
                        {missing.slice(0, 3).map((m) => (
                          <Link
                            key={m.key}
                            href={routeForMissing(me?.role, m.key)}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <span className="truncate">{m.label}</span>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-500">Step {m.step}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                      <p className="font-semibold">Profile is complete ✅</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                        Keep improving by adding more packages, boosting visibility, and responding fast to messages.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Package performance */}
          {me?.role === "INFLUENCER" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-extrabold">Package performance</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                    See which packages are attracting brands. Focus on improving the top performers.
                  </p>
                </div>
                <Link href="/creator/packages" className="text-sm font-semibold text-emerald-600 hover:underline">
                  Manage packages
                </Link>
              </div>

              {topPackages.length ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-widest text-slate-400 dark:border-zinc-800">
                        <th className="py-3 pr-4">Package</th>
                        <th className="py-3 pr-4">Price</th>
                        <th className="py-3 pr-4">Views</th>
                        <th className="py-3 pr-4">Clicks</th>
                        <th className="py-3 pr-4">Saves</th>
                        <th className="py-3 pr-4">Orders</th>
                        <th className="py-3">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPackages.map((p) => {
                        const ctr = safeDiv(p.clicks, p.views);
                        const maxViews = Math.max(1, ...topPackages.map((x) => x.views || 0));
                        const bar = Math.max(3, Math.round(((p.views || 0) / maxViews) * 120));
                        return (
                          <tr key={p.packageId} className="border-b border-slate-100 dark:border-zinc-900">
                            <td className="py-4 pr-4">
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{p.title}</p>
                                <p className="text-xs text-slate-500 dark:text-zinc-500">{p.platform}</p>
                              </div>
                            </td>
                            <td className="py-4 pr-4 font-semibold">{currencyINR(p.price || 0)}</td>
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="h-2 w-[140px] rounded-full bg-slate-100 dark:bg-zinc-900">
                                  <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${bar}px` }} />
                                </div>
                                <span className="text-xs text-slate-600 dark:text-zinc-400">{p.views}</span>
                              </div>
                            </td>
                            <td className="py-4 pr-4">{p.clicks}</td>
                            <td className="py-4 pr-4">{p.saves}</td>
                            <td className="py-4 pr-4 font-semibold">{p.orders}</td>
                            <td className="py-4">{pct(ctr)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
                  No package analytics yet. Create packages and share your profile to start collecting data.
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {active === 'insights' && <InsightsPage />}



      {active === "inbox" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Inbox</h2>
            <Link href="/myaccount/inbox" className="text-sm font-semibold text-emerald-600 hover:underline">
              Open full inbox
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {threads.length ? (
              threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/myaccount/inbox/${thread.id}`}
                  className="block rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <p className="font-semibold">{thread.otherUser.name}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 truncate">
                    {thread.lastMessage || "No messages yet"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-zinc-400">Your inbox is empty.</p>
            )}
          </div>
        </div>
      ) : null}

      {active === "orders" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Orders History</h2>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-emerald-600 hover:underline">
              Open full orders
            </Link>
          </div>
          <div className="space-y-3">
            {orders.length ? (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">
                      {order.package?.title || "Package"} · {order.package?.platform || "platform"}
                    </div>
                    <span className="text-xs text-slate-500">
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Order #{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-zinc-400">No orders yet.</p>
            )}
          </div>
        </div>
      ) : null}

      {active === "settings" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
          <h2 className="text-lg font-extrabold">Account Settings</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Update your profile, contact information, and onboarding data.
          </p>
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-zinc-800">
            <p>
              <span className="font-semibold">Email:</span> {me?.email || "N/A"}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Username:</span> {me?.username || "N/A"}
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Edit account settings
          </Link>
        </div>
      ) : null}

      {active === "membership" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
          <h2 className="text-lg font-extrabold">Manage Membership</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Unlock premium messaging and priority placement.
          </p>
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-zinc-800">
            <p>
              <span className="font-semibold">Status:</span> {me?.isPremium ? "Premium active" : "Free tier"}
            </p>
          </div>
          {!me?.isPremium ? (
            <button className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Upgrade to Premium
            </button>
          ) : (
            <button className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-zinc-800">
              Manage billing
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
