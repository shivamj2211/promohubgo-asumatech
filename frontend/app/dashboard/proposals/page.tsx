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
  brand?: { id: string; name?: string | null; username?: string | null } | null;
};

export default function CreatorProposalsPage() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await apiFetch("/api/proposals");
    setItems(Array.isArray(res?.items) ? res.items : []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
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

  const updateStatus = async (id: string, status: "ACCEPTED" | "REJECTED") => {
    await apiFetch(`/api/proposals/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  };

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <TopNav />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-extrabold">Proposals</h1>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No proposals yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">
                    {p.brand?.name || p.brand?.username || "Brand"} · ${p.price}
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

              {p.status === "PENDING" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => updateStatus(p.id, "ACCEPTED")}
                    className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => updateStatus(p.id, "REJECTED")}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      </main>
      <SiteFooter />
    </div>
  );
}
