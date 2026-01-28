"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/footer/site-footer";

type Proposal = {
  id: string;
  status: string;
  price: number;
  message: string;
  createdAt: string;
  package?: { id: string; title: string; platform: string } | null;
  creator?: { id: string; name?: string | null; username?: string | null } | null;
};

export default function BrandProposalsPage() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch("/api/proposals");
        if (!active) return;
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <TopNav />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-extrabold">My Proposals</h1>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No proposals yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">
                    {p.creator?.name || p.creator?.username || "Creator"} · ${p.price}
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.package?.title || "Custom package"} · {p.status}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{p.message}</p>
                </div>
                <Link
                  href={`/proposals/${p.id}`}
                  className="text-sm font-semibold underline"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      </main>
      <SiteFooter />
    </div>
  );
}
