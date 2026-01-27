"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Order = {
  id: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  package?: { id: string; title: string; platform: string; price: number } | null;
};

type Payment = {
  id: string;
  status: string;
  amount: number;
  provider: string;
};

export default function OrderCheckoutPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const orderRes = await apiFetch(`/api/orders/${params.orderId}`);
    setOrder(orderRes || null);
    const paymentRes = await apiFetch(`/api/payments/${params.orderId}`).catch(() => null);
    setPayment(paymentRes?.payment || null);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load order");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.orderId]);

  const payNow = async () => {
    setPaying(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/payments/mock/${params.orderId}`, {
        method: "POST",
      });
      setPayment(res?.payment || null);
      setOrder(res?.order || order);
    } catch (e: any) {
      setError(e?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="p-10">Loading...</div>;
  if (!order) return <div className="p-10">Order not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Checkout</h1>
        <button onClick={() => router.back()} className="text-sm underline">
          Back
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
        <div className="font-semibold">{order.package?.title || "Package"}</div>
        <div className="text-xs text-slate-500">
          {order.package?.platform} · Order #{order.id.slice(0, 8)}
        </div>
        <div className="text-sm">
          Status: <b>{order.status}</b>
        </div>
        <div className="text-lg font-extrabold">${(order.totalPrice || 0).toFixed(2)}</div>
      </div>

      {payment ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Payment {payment.status} · {payment.provider}
        </div>
      ) : null}

      <button
        disabled={paying || payment?.status === "SUCCESS"}
        onClick={payNow}
        className="w-full rounded-2xl bg-slate-900 text-white py-3 text-sm font-extrabold disabled:opacity-60"
      >
        {payment?.status === "SUCCESS" ? "Paid" : paying ? "Processing..." : "Pay Now"}
      </button>
    </div>
  );
}
