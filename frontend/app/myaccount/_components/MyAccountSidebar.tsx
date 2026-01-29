"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

const nav = [
  { href: "/myaccount?tab=dashboard", label: "Dashboard", id: "dashboard" },
  { href: "/myaccount?tab=analytics", label: "Analytics", id: "analytics" },
  { href: "/myaccount?tab=insights", label: "Insights", id: "insights" },
  { href: "/myaccount?tab=orders", label: "Orders History", id: "orders" },
  { href: "/myaccount?tab=inbox", label: "Inbox", id: "inbox" },
  { href: "/myaccount/boosters", label: "Boosters", id: "boosters" },
  { href: "/myaccount?tab=settings", label: "Account Settings", id: "settings" },
  { href: "/myaccount?tab=membership", label: "Manage Membership", id: "membership" },
] as const;

export default function MyAccountSidebar() {
  const params = useSearchParams();
  const pathname = usePathname();

  const tab = (params.get("tab") || "dashboard") as (typeof nav)[number]["id"];
  const onSavedSearches = pathname === "/myaccount/saved-searches";
  const onBoosters = pathname === "/myaccount/boosters";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-widest text-slate-400">My Account</p>

      <div className="mt-4 space-y-1">
        {nav.map((item) => {
          const active = item.id === "boosters" ? onBoosters : !onSavedSearches && tab === item.id;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                active
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
        <Link
          href="/myaccount/saved-searches"
          className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
            onSavedSearches
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }`}
        >
          Saved Searches
        </Link>
        <p className="mt-2 text-[12px] text-slate-500 dark:text-zinc-400">
          Brand-only: save multiple presets with name + tags.
        </p>
      </div>
    </div>
  );
}
