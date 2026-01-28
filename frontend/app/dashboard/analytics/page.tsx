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
};

type Analytics = {
  packageId: string;
  views: number;
  clicks: number;
  saves: number;
  orders: number;
};

type Row = {
  pkg: Package;
  analytics: Analytics;
};

export default function AnalyticsDashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const packages = (await apiFetch("/api/influencer-packages/mine")) as Package[];
        const analyticsList = await Promise.all(
          packages.map((pkg) =>
            apiFetch(`/api/analytics/package/${pkg.id}`).catch(() => ({
              packageId: pkg.id,
              views: 0,
              clicks: 0,
              saves: 0,
              orders: 0,
            }))
          )
        );

        if (!alive) return;

        const analyticsMap = new Map(
          analyticsList.map((item: Analytics) => [item.packageId, item])
        );

        const combined = packages.map((pkg) => ({
          pkg,
          analytics: analyticsMap.get(pkg.id) || {
            packageId: pkg.id,
            views: 0,
            clicks: 0,
            saves: 0,
            orders: 0,
          },
        }));

        setRows(combined);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <TopNav />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-extrabold">Package Analytics</h1>

      {rows.length === 0 && (
        <p className="text-sm text-slate-500">No analytics yet.</p>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.pkg.id}
            className="border rounded-2xl p-4 flex flex-col gap-2 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{row.pkg.title}</p>
                <p className="text-xs text-slate-500 capitalize">
                  {row.pkg.platform} - ${row.pkg.price}
                </p>
              </div>
              <span className="text-xs text-slate-400">{row.pkg.id.slice(0, 8)}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="border rounded-xl p-3">
                <p className="text-xs text-slate-500">Views</p>
                <p className="font-bold text-lg">{row.analytics.views}</p>
              </div>
              <div className="border rounded-xl p-3">
                <p className="text-xs text-slate-500">Clicks</p>
                <p className="font-bold text-lg">{row.analytics.clicks}</p>
              </div>
              <div className="border rounded-xl p-3">
                <p className="text-xs text-slate-500">Saves</p>
                <p className="font-bold text-lg">{row.analytics.saves}</p>
              </div>
              <div className="border rounded-xl p-3">
                <p className="text-xs text-slate-500">Orders</p>
                <p className="font-bold text-lg">{row.analytics.orders}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      </main>
      <SiteFooter />
    </div>
  );
}
