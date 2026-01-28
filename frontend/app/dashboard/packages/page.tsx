"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/footer/site-footer";

type Package = {
  id: string;
  title: string;
  platform: string;
  price: number;
  description?: string | null;
  isActive: boolean;
};

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "ugc", label: "UGC" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X (Twitter)" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
];

export default function PackagesDashboardPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    platform: "instagram",
    price: "",
    description: "",
  });

  /* ================= FETCH ================= */

  const loadPackages = async () => {
    try {
      const res = await apiFetch("/api/influencer-packages/mine");
      setPackages(res);
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  /* ================= CREATE ================= */

  const createPackage = async () => {
    if (!form.title || !form.price) return;

    await apiFetch("/api/influencer-packages", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        platform: form.platform,
        price: Number(form.price),
        description: form.description,
      }),
    });

    setForm({ title: "", platform: "instagram", price: "", description: "" });
    loadPackages();
  };

  /* ================= TOGGLE ================= */

  const toggleActive = async (pkg: Package) => {
    await apiFetch(`/api/influencer-packages/${pkg.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !pkg.isActive }),
    });
    loadPackages();
  };

  /* ================= DELETE ================= */

  const deletePackage = async (id: string) => {
    if (!confirm("Delete this package?")) return;

    await apiFetch(`/api/influencer-packages/${id}`, {
      method: "DELETE",
    });
    loadPackages();
  };

  /* ================= UI ================= */

  if (loading) return <div className="p-10">Loading…</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <TopNav />
      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-extrabold">Your Packages</h1>

      {/* ===== CREATE FORM ===== */}
      <div className="border rounded-2xl p-5 space-y-4 dark:border-zinc-800">
        <h2 className="font-bold">Create Package</h2>

        <input
          placeholder="Title (e.g. Instagram Reel)"
          className="w-full border rounded-xl px-3 py-2 dark:border-zinc-700"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <select
          className="w-full border rounded-xl px-3 py-2 dark:border-zinc-700"
          value={form.platform}
          onChange={(e) =>
            setForm({ ...form, platform: e.target.value })
          }
        >
          {PLATFORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Price"
          className="w-full border rounded-xl px-3 py-2 dark:border-zinc-700"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />

        <textarea
          placeholder="Description (optional)"
          className="w-full border rounded-xl px-3 py-2 dark:border-zinc-700"
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />

        <button
          onClick={createPackage}
          className="bg-pink-600 text-white px-5 py-2 rounded-xl font-bold"
        >
          Add Package
        </button>
      </div>

      {/* ===== LIST ===== */}
      <div className="space-y-4">
        {packages.length === 0 && (
          <p className="text-sm text-slate-500">
            No packages created yet.
          </p>
        )}

        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="border rounded-2xl p-4 flex justify-between items-start dark:border-zinc-800"
          >
            <div>
              <p className="font-bold">{pkg.title}</p>
              <p className="text-sm capitalize text-slate-500">
                {pkg.platform}
              </p>
              <p className="text-sm mt-1">${pkg.price}</p>
              {pkg.description && (
                <p className="text-xs mt-1 text-slate-500">
                  {pkg.description}
                </p>
              )}
            </div>

            <div className="flex gap-3 text-sm">
              <button
                onClick={() => toggleActive(pkg)}
                className="underline"
              >
                {pkg.isActive ? "Disable" : "Enable"}
              </button>

              <button
                onClick={() => deletePackage(pkg.id)}
                className="underline text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      </main>
      <SiteFooter />
    </div>
  );
}
