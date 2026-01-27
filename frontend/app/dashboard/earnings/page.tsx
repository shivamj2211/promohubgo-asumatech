"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Package = {
  id: string;
  title: string;
  platform: string;
  price: number;
};

type Order = {
  id: string;
  status: string;
  createdAt: string;
  totalPrice: number;
};

type Earning = {
  id: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  createdAt: string;
  order?: Order | null;
  package?: Package | null;
};

export default function EarningsPage() {
  const [items, setItems] = useState<Earning[]>([]);
  const [totals, setTotals] = useState<{ gross: number; fees: number; net: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch("/api/creator/earnings");
        if (!active) return;
        setItems(Array.isArray(res?.items) ? res.items : []);
        setTotals(res?.totals || null);
      } catch {
        if (active) {
          setItems([]);
          setTotals(null);
        }
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-extrabold">Your Earnings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Gross</div>
          <div className="text-xl font-extrabold">${(totals?.gross || 0).toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Platform Fee</div>
          <div className="text-xl font-extrabold">${(totals?.fees || 0).toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Net</div>
          <div className="text-xl font-extrabold">${(totals?.net || 0).toFixed(2)}</div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No earnings yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {item.package?.title || "Package"} · {item.package?.platform || "platform"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Order #{item.order?.id?.slice(0, 8) || "—"} · {item.order?.status || "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${item.netAmount.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">Net</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Gross ${item.grossAmount.toFixed(2)} · Fee ${item.platformFee.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
