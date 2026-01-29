"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ShoppingCart } from "lucide-react";

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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!open) return;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

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
    <nav className="border-b border-slate-200/70 bg-white/80 backdrop-blur sticky top-0 z-50 dark:border-zinc-800/80 dark:bg-zinc-950/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
        <Link
          href="/"
          className="text-2xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent tracking-tight"
        >
          PromoHubGo
        </Link>
        {!me ? (
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              Join Now
            </Link>
          </div>
        ) : (
          <div className="relative flex items-center gap-3" ref={menuRef}>
            <Link
              href="/checkout"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
            </Link>
            <Link href="/brand/campaigns" className="...">
  Campaigns
</Link>
            <button
              onClick={() => setOpen((v) => !v)}
              ref={buttonRef}
              className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-sm hover:shadow-md transition dark:border-zinc-800 dark:bg-zinc-950"
              title="Account"
            >
              <span className="text-sm font-semibold">
                {(me.username || me.email || "U").slice(0, 1).toUpperCase()}
              </span>
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-3 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
                <div className="px-4 py-3 text-sm border-b border-slate-100 dark:border-zinc-800">
                  <div className="font-semibold truncate">
                    {me.username || "User"}
                  </div>
                  <div className="text-gray-500 dark:text-zinc-400 truncate">
                    {me.email || ""}
                  </div>
                </div>
                <Link
                  href="/myaccount"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  My account
                </Link>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  Account settings
                </Link>
                {me.role === "INFLUENCER" && (
                  <Link
                    href="/boosters"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-zinc-900"
                  >
                    Boosters
                  </Link>
                )}
                <Link
                  href="/dashboard/orders"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  Orders History
                </Link>
                {me.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-zinc-900"
                  >
                    Admin panel
                  </Link>
                )}
                <div
                  className="flex px-4 py-3 text-sm items-center justify-between border-t border-slate-100 dark:border-zinc-800"
                >
                  <span>Premium</span>
                  <span className="font-semibold">
                    {me.isPremium ? "Yes" : "No"}
                  </span>
                </div>
                <button
                  className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-zinc-900"
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
