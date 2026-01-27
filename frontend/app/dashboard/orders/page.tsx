"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Package = {
  id: string;
  title: string;
  platform: string;
  price: number;
  description?: string | null;
};

type Order = {
  id: string;
  status: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  package?: Package | null;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/orders/mine")
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-extrabold">Your Orders</h1>

      {orders.length === 0 && (
        <p className="text-sm text-slate-500">No orders yet.</p>
      )}

      {orders.map((o) => (
        <div
          key={o.id}
          className="border rounded-2xl p-4 space-y-1 dark:border-zinc-800"
        >
          <p className="font-semibold">Order #{o.id.slice(0, 8)}</p>
          <p className="text-sm text-slate-500">
            Status: <b>{o.status}</b>
          </p>
          <p className="text-sm">
            Package: {o.package?.title || o.listingId}
          </p>
          {o.package && (
            <p className="text-xs text-slate-500">
              {o.package.platform} - ${o.package.price}
            </p>
          )}
          {["PENDING", "ACCEPTED"].includes(o.status) ? (
            <a
              href={`/checkout/${o.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-3 py-1 text-xs font-semibold"
            >
              Pay Now
            </a>
          ) : null}
          <p className="text-xs text-slate-400">
            {new Date(o.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
