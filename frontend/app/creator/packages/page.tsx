"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import JourneyStepper from "@/components/JourneyStepper";
import { TopNav } from "@/components/top-nav";
import { getRouteForStep } from "@/config/onboardingFlow";

type PackageItem = {
  id: string;
  title: string;
  platform: string;
  price: number;
  description?: string | null;
  isActive?: boolean;
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

export default function OnboardingPackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [backHref, setBackHref] = useState("/portfolio");

  const [form, setForm] = useState({
    title: "",
    platform: "instagram",
    price: "",
    description: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [meRes, packagesRes] = await Promise.all([
          apiFetch("/api/me"),
          apiFetch("/api/influencer-packages/mine"),
        ]);
        if (!active) return;
        const user = meRes?.user || {};
        setBackHref(getRouteForStep(user.role, 7) || "/portfolio");
        setPackages(Array.isArray(packagesRes) ? packagesRes : []);
      } catch (e: any) {
        if (active) {
          setPackages([]);
          setError(e?.message || "Failed to load packages");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const createPackage = async () => {
    if (!form.title.trim() || !form.price) return;
    setError("");
    setSaving(true);
    try {
      await apiFetch("/api/influencer-packages", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          platform: form.platform,
          price: Number(form.price),
          description: form.description.trim() || null,
        }),
      });
      const res = await apiFetch("/api/influencer-packages/mine");
      setPackages(Array.isArray(res) ? res : []);
      setForm({ title: "", platform: "instagram", price: "", description: "" });
    } catch (e: any) {
      setError(e?.message || "Failed to create package");
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (packages.length === 0) {
      setError("Create at least one package to continue.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/influencer/profile", {
        method: "PATCH",
        body: JSON.stringify({ onboardingStep: 8 }),
      });
      router.push("/boosters");
    } catch (e: any) {
      setError(e?.message || "Failed to continue onboarding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
      <TopNav />
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-lg shadow-lg p-8">
        <JourneyStepper />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
          Create your first package
        </h1>
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
          Packages help brands understand your services and pricing.
        </p>

        <div className="rounded-lg border border-gray-200 dark:border-zinc-800 p-4 mb-6 space-y-3">
          <div className="font-semibold text-sm text-gray-800 dark:text-zinc-200">New package</div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Package title"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <select
              value={form.platform}
              onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Price"
              type="number"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            onClick={createPackage}
            disabled={saving}
            className="mt-2 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add package"}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-800 dark:text-zinc-200">Your packages</span>
            <a href={backHref} className="text-gray-500 dark:text-zinc-400 hover:underline">
              Back
            </a>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 dark:text-zinc-400">Loading packages...</div>
          ) : packages.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-zinc-400">
              No packages added yet.
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-lg border border-gray-200 dark:border-zinc-800 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-zinc-100">
                        {pkg.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        {pkg.platform} · {pkg.description || "No description"}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-zinc-100">
                      ${pkg.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          onClick={handleContinue}
          disabled={saving}
          className={`mt-6 w-full py-3 text-white font-semibold rounded-lg transition ${
            saving ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {saving ? "Saving..." : "Continue"}
        </button>
        </div>
      </div>
    </div>
  );
}
