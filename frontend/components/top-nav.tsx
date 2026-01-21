"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * TopNav shows the PromoHubGo brand and either sign-in/sign-up buttons
 * when the user is not logged in, or a profile avatar with a dropdown
 * when logged in. It automatically fetches the current user on mount.
 * This component should be used on pages that need navigation
 * consistency (e.g. listings, dashboard). It supports dark mode
 * styles out of the box.
 */
export function TopNav() {
  type Me = {
    id: string;
    email?: string | null;
    username?: string | null;
    role?: string | null;
    onboardingStep?: number | null;
    onboardingCompleted?: boolean | null;
    isPremium?: boolean | null;
    isAdmin?: boolean | null;
  };

  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch("/api/me", { method: "GET" });
        if (active) {
          setMe(res?.user || null);
        }
      } catch {
        if (active) setMe(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      // reload page to clear local state and cookies
      window.location.href = "/";
    }
  }

  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-50 dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
        >
          PromoHubGo
        </Link>
        {!me ? (
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Join Now
            </Link>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="h-10 w-10 rounded-full border border-gray-300 bg-white flex items-center justify-center dark:border-zinc-800 dark:bg-zinc-950"
              title="Account"
            >
              <span className="text-sm font-semibold">
                {(me.username || me.email || "U").slice(0, 1).toUpperCase()}
              </span>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
                <div className="px-4 py-3 text-sm border-b border-gray-100 dark:border-zinc-800">
                  <div className="font-semibold truncate">
                    {me.username || "User"}
                  </div>
                  <div className="text-gray-500 dark:text-zinc-400 truncate">
                    {me.email || ""}
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-900"
                >
                  Account settings
                </Link>
                {me.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-900"
                  >
                    Admin panel
                  </Link>
                )}
                <div
                  className="flex px-4 py-3 text-sm items-center justify-between border-t border-gray-100 dark:border-zinc-800"
                >
                  <span>Premium</span>
                  <span className="font-semibold">
                    {me.isPremium ? "Yes" : "No"}
                  </span>
                </div>
                <button
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-900"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
