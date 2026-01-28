"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/footer/site-footer";

type Package = {
  id: string;
  title: string;
  platform: string;
  price: number;
  description?: string | null;
};

type CartItem = {
  id: string;
  quantity: number;
  package?: Package | null;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch("/api/cart");
        if (!active) return;
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load cart");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = item.package?.price || 0;
      return acc + price * (item.quantity || 1);
    }, 0);
  }, [items]);

  const updateQuantity = async (item: CartItem, nextQty: number) => {
    if (nextQty < 1) return;
    setUpdatingId(item.id);
    setError(null);
    try {
      const res = await apiFetch(`/api/cart/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: nextQty }),
      });
      const updated = res?.item;
      if (updated) {
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, quantity: updated.quantity } : it))
        );
      }
    } catch (e: any) {
      setError(e?.message || "Failed to update quantity");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    setUpdatingId(item.id);
    setError(null);
    try {
      await apiFetch(`/api/cart/${item.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (e: any) {
      setError(e?.message || "Failed to remove item");
    } finally {
      setUpdatingId(null);
    }
  };

  const checkout = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({ fromCart: true }),
      });
      setItems([]);
      router.push("/dashboard/orders");
    } catch (e: any) {
      setError(e?.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <TopNav />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Checkout</h1>
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold underline"
        >
          Back
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
          Your cart is empty.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.package?.title || "Package"}</p>
                  <p className="text-xs text-slate-500">
                    {item.package?.platform} · Qty {item.quantity}
                  </p>
                </div>
                <div className="font-bold">
                  ${((item.package?.price || 0) * (item.quantity || 1)).toFixed(2)}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    disabled={updatingId === item.id || item.quantity <= 1}
                    onClick={() => updateQuantity(item, (item.quantity || 1) - 1)}
                    className="h-9 w-9 rounded-full border border-slate-200 text-lg font-semibold disabled:opacity-50"
                  >
                    -
                  </button>
                  <div className="min-w-[48px] text-center text-sm font-semibold">
                    {item.quantity}
                  </div>
                  <button
                    disabled={updatingId === item.id}
                    onClick={() => updateQuantity(item, (item.quantity || 1) + 1)}
                    className="h-9 w-9 rounded-full border border-slate-200 text-lg font-semibold disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
                <button
                  disabled={updatingId === item.id}
                  onClick={() => removeItem(item)}
                  className="text-sm font-semibold text-rose-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">Subtotal</div>
        <div className="text-lg font-extrabold">${subtotal.toFixed(2)}</div>
      </div>

      <button
        disabled={submitting || items.length === 0}
        onClick={checkout}
        className="w-full rounded-2xl bg-slate-900 text-white py-3 text-sm font-extrabold disabled:opacity-60"
      >
        {submitting ? "Processing..." : "Place Order"}
      </button>
      </main>
      <SiteFooter />
    </div>
  );
}
