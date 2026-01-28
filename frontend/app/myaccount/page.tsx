"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

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

export default function MyAccountPage() {
  const searchParams = useSearchParams();
  const active =
    (searchParams.get("tab") as
      | "dashboard"
      | "analytics"
      | "orders"
      | "inbox"
      | "settings"
      | "membership"
      | null) || "dashboard";

  const [me, setMe] = useState<Me | null>(null);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activeRequest = true;
    (async () => {
      try {
        setLoading(true);
        const [meRes, threadsRes, ordersRes] = await Promise.all([
          apiFetch("/api/me"),
          apiFetch("/api/threads"),
          apiFetch("/api/orders/mine"),
        ]);
        if (!activeRequest) return;
        setMe(meRes?.user || null);
        setThreads(Array.isArray(threadsRes?.data) ? threadsRes.data : []);
        setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      } catch {
        if (activeRequest) {
          setMe(null);
          setThreads([]);
          setOrders([]);
        }
      } finally {
        if (activeRequest) setLoading(false);
      }
    })();
    return () => {
      activeRequest = false;
    };
  }, []);

  const recentThreads = useMemo(() => threads.slice(0, 4), [threads]);
  const threadCount = threads.length;

  return (
    <>
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Loading your account...
        </div>
      ) : null}

      {active === "dashboard" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h1 className="text-2xl font-extrabold">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
              Welcome back {me?.name || me?.username || "there"}. Here is a quick snapshot.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-widest text-slate-400">Threads</p>
                <p className="mt-2 text-2xl font-extrabold">{threadCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-widest text-slate-400">Role</p>
                <p className="mt-2 text-2xl font-extrabold">{me?.role || "N/A"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-widest text-slate-400">Premium</p>
                <p className="mt-2 text-2xl font-extrabold">{me?.isPremium ? "Active" : "Free"}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/myaccount/saved-searches"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Open Saved Searches
              </Link>
              <Link
                href="/listings"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Explore listings
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Recent Activity</h2>
              <Link href="/inbox" className="text-sm font-semibold text-emerald-600 hover:underline">
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
                    <Link href={`/inbox/${thread.id}`} className="text-xs font-semibold text-emerald-600 hover:underline">
                      View
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-zinc-400">No recent conversations yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {active === "analytics" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
          <h2 className="text-lg font-extrabold">Analytics</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Engagement metrics update as your profile receives activity.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-widest text-slate-400">Views</p>
              <p className="mt-2 text-xl font-extrabold">N/A</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-widest text-slate-400">Clicks</p>
              <p className="mt-2 text-xl font-extrabold">N/A</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-widest text-slate-400">Contact Requests</p>
              <p className="mt-2 text-xl font-extrabold">{threadCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-widest text-slate-400">Response Time</p>
              <p className="mt-2 text-xl font-extrabold">N/A</p>
            </div>
          </div>
        </div>
      ) : null}

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
