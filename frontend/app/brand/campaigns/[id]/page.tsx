"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Campaign = any;

type SuggestedInfluencer = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  city: string | null;
  followers: number;
  categories: string[];
  languages: string[];
  score: number;
};

type RoiResponse = {
  ok: boolean;
  roi?: {
    spend: number;
    orders: { total: number; pending: number; completed: number; cancelled: number };
    avgOrderValue: number;
    funnel: Record<string, number>;
    efficiency: {
      spendPerOrder: number;
      spendPerApprovedCreator: number;
      clickToOrder: number;
    };
    creators: Array<{
      influencerId: string;
      name: string;
      username: string | null;
      status: string;
      orders: number;
      spend: number;
      avgOrderValue: number;
      topListings: Array<{ listingId: string; title: string; price: number; count: number }>;
    }>;
  };
};

type SmartPackageResponse = {
  ok: boolean;
  recommended?: {
    listingId: string;
    title: string;
    price: number;
    score: number;
    reasons: string[];
  } | null;
  alternatives?: Array<{
    listingId: string;
    title: string;
    price: number;
    score: number;
    reasons: string[];
  }>;
  note?: string;
};

// ✅ NEW: for approve modal package dropdown (minimal type)
type ListingLite = { id: string; title: string; price: number };

function Badge({ children }: any) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-zinc-900 dark:text-zinc-200">
      {children}
    </span>
  );
}

function currencyINR(v: number) {
  const n = Number(v || 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
}

function pct(n: number) {
  if (!isFinite(n)) return "0%";
  return `${Math.round(n * 100)}%`;
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [suggested, setSuggested] = useState<SuggestedInfluencer[]>([]);
  const [loading, setLoading] = useState(true);

  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ✅ keep your logic + add roi tab
  const [tab, setTab] = useState<"roi" | "suggested" | "invited">("suggested");
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // ✅ ROI state
  const [roi, setRoi] = useState<RoiResponse["roi"] | null>(null);
  const [roiLoading, setRoiLoading] = useState(false);

  // ✅ smart package state (used in Suggested Invite panel)
  const [smart, setSmart] = useState<SmartPackageResponse | null>(null);
  const [smartLoading, setSmartLoading] = useState(false);

  // ✅ NEW: Approve UI state (does NOT remove your features)
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveInfluencerId, setApproveInfluencerId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);

  const [creatorListings, setCreatorListings] = useState<ListingLite[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const [smartApprove, setSmartApprove] = useState<SmartPackageResponse | null>(null);
  const [smartApproveLoading, setSmartApproveLoading] = useState(false);

  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/brand/campaigns/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to load campaign");
      setCampaign(json.campaign);

      // suggested list (if route exists)
      const sres = await fetch(`/api/brand/campaigns/${id}/suggested`, { cache: "no-store" });
      if (sres.ok) {
        const sjson = await sres.json();
        if (sjson?.ok) setSuggested(sjson.suggested || []);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function loadROI() {
    setRoiLoading(true);
    try {
      const res = await fetch(`/api/brand/campaigns/${id}/roi`, { cache: "no-store" });
      const json: RoiResponse = await res.json();
      if (!json?.ok) throw new Error((json as any)?.error || "Failed to load ROI");
      setRoi(json.roi || null);
    } catch (e) {
      console.error("ROI load error:", e);
      setRoi(null);
    } finally {
      setRoiLoading(false);
    }
  }

  async function loadSmartPackage(influencerId: string) {
    setSmartLoading(true);
    setSmart(null);
    try {
      const res = await fetch(`/api/brand/campaigns/${id}/smart-package?influencerId=${encodeURIComponent(influencerId)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setSmart(json);
    } catch (e) {
      console.error("smart package error", e);
      setSmart(null);
    } finally {
      setSmartLoading(false);
    }
  }

  // ✅ NEW: smart package for Approve modal (separate state so it won't break your invite panel)
  async function loadSmartPackageForApprove(influencerId: string) {
    setSmartApproveLoading(true);
    setSmartApprove(null);
    try {
      const res = await fetch(`/api/brand/campaigns/${id}/smart-package?influencerId=${encodeURIComponent(influencerId)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setSmartApprove(json);
    } catch (e) {
      console.error("smart approve error", e);
      setSmartApprove(null);
    } finally {
      setSmartApproveLoading(false);
    }
  }

  // ✅ NEW: load creator packages for dropdown (uses your existing route if you already have it)
  async function loadCreatorListings(influencerId: string) {
    setListingsLoading(true);
    setListingsError(null);
    setCreatorListings([]);
    try {
      const res = await fetch(`/api/creators/${encodeURIComponent(influencerId)}/listings`, { cache: "no-store" });

      // if route not present, avoid breaking page
      if (!res.ok) {
        setListingsError(`Packages API not available (${res.status}).`);
        return;
      }

      const json = await res.json();
      if (json?.ok) setCreatorListings(json.listings || []);
      else setListingsError(json?.error || "Failed to load packages");
    } catch (e: any) {
      setListingsError(e?.message || "Failed to load packages");
    } finally {
      setListingsLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadAll();
      loadROI(); // ✅ load ROI in background
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const budgetLabel = useMemo(() => {
    const min = campaign?.minBudget;
    const max = campaign?.maxBudget;
    if (min || max) return `${currencyINR(min || 0)}–${currencyINR(max || 0)}`;
    return "—";
  }, [campaign]);

  async function updateStatus(status: string) {
    try {
      const res = await fetch(`/api/brand/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed");
      setCampaign(json.campaign);
      await loadROI();
    } catch (e: any) {
      alert(e?.message || "Failed to update");
    }
  }

  async function invite(influencerId: string) {
    setSubmittingInvite(true);
    try {
      const res = await fetch(`/api/brand/campaigns/${id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerId,
          message: inviteMsg || undefined,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Invite failed");
      setInviteMsg("");
      setInvitingId(null);
      setSmart(null);
      await loadAll();
      await loadROI();
      setTab("invited");
    } catch (e: any) {
      alert(e?.message || "Invite failed");
    } finally {
      setSubmittingInvite(false);
    }
  }

  // ✅ NEW: status patch for influencer pipeline (uses your brandcampaignstatus.js)
  async function patchInfluencerStatus(influencerId: string, status: string, extra?: any) {
    const res = await fetch(`/api/brand/campaigns/${id}/influencers/${encodeURIComponent(influencerId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(extra || {}) }),
    });
    const json = await res.json();
    if (!json?.ok) throw new Error(json?.error || "Failed");
    return json;
  }

  // ✅ NEW: Open approve modal (does not change existing invited UI; only adds)
  async function openApprove(influencerId: string) {
    setApproveInfluencerId(influencerId);
    setApproveNote("");
    setSelectedPackageId("");
    setApproveOpen(true);

    // load both in background
    loadSmartPackageForApprove(influencerId);
    loadCreatorListings(influencerId);
  }

  // auto-select smart recommended package when available
  useEffect(() => {
    if (!approveOpen) return;
    const rec = smartApprove?.recommended?.listingId;
    if (rec) setSelectedPackageId(rec);
  }, [smartApprove, approveOpen]);

  async function approveNow() {
    if (!approveInfluencerId) return;
    if (!selectedPackageId) {
      alert("Please select a package");
      return;
    }
    setApproveLoading(true);
    try {
      await patchInfluencerStatus(approveInfluencerId, "approved", {
        packageId: selectedPackageId,
        note: approveNote || undefined,
      });

      setApproveOpen(false);
      setApproveInfluencerId(null);
      setApproveNote("");
      setSelectedPackageId("");
      setCreatorListings([]);
      setSmartApprove(null);

      await loadAll();
      await loadROI();
      setTab("invited");
    } catch (e: any) {
      alert(e?.message || "Approve failed");
    } finally {
      setApproveLoading(false);
    }
  }

  async function quickStatus(influencerId: string, status: "rejected" | "completed") {
    try {
      await patchInfluencerStatus(influencerId, status);
      await loadAll();
      await loadROI();
    } catch (e: any) {
      alert(e?.message || "Failed");
    }
  }

  if (loading) return <div className="p-8 text-sm text-slate-600 dark:text-zinc-400">Loading campaign...</div>;
  if (error) return <div className="p-8 text-sm text-red-600 dark:text-red-300">{error}</div>;
  if (!campaign) return <div className="p-8 text-sm">Not found</div>;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Link href="/brand/campaigns" className="text-sm font-semibold text-emerald-600 hover:underline">
              ← Back
            </Link>
            <h1 className="mt-2 truncate text-2xl font-extrabold">{campaign.name}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
              {campaign.objective} · {campaign.platform} · Budget {budgetLabel}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>Status: {String(campaign.status).toUpperCase()}</Badge>
              <Badge>Creators linked: {campaign.influencers?.length || 0}</Badge>
              <Badge>Types: {(campaign.contentTypes || []).join(", ") || "—"}</Badge>
              <Badge>Premium: ROI + Invoice</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* ✅ Invoice PDF */}
            <button
              onClick={() => window.open(`/api/brand/campaigns/${id}/invoice.pdf`, "_blank")}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              Download Invoice (PDF)
            </button>

            {campaign.status !== "live" ? (
              <button
                onClick={() => updateStatus("live")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700"
              >
                Publish
              </button>
            ) : (
              <button
                onClick={() => updateStatus("paused")}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Pause
              </button>
            )}
            <button
              onClick={() => updateStatus("completed")}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              Mark completed
            </button>
          </div>
        </div>

        {campaign.description ? (
          <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-zinc-800 dark:text-zinc-200">
            {campaign.description}
          </div>
        ) : null}
      </div>

      {/* KPIs (keep yours, but map impressions if backend uses impressions) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI label="Views" value={campaign.stats?.views ?? campaign.stats?.impressions ?? 0} hint="Total campaign visibility" />
        <KPI label="Clicks" value={campaign.stats?.clicks ?? 0} hint="Interest signal" />
        <KPI label="Saves" value={campaign.stats?.saves ?? 0} hint="Shortlisted by brands" />
        <KPI label="Orders" value={roi?.orders?.total ?? campaign.stats?.orders ?? 0} hint="Purchases generated" />
      </div>

      {/* ✅ KEEP your Campaign insights (Premium) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Campaign insights</h2>
          <Badge>Premium</Badge>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
            <p className="text-sm font-extrabold">Match strength</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
              Your requirements decide who we suggest. Broader filters = more creators, tighter filters = higher match quality.
            </p>
            <p className="mt-3 text-xs">
              Tip: If suggestions are low, relax <b>location</b> or <b>min followers</b>.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
            <p className="text-sm font-extrabold">Acceptance likelihood</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">Clear budgets + clear deliverables increases acceptance rate.</p>
            <p className="mt-3 text-xs">Tip: Add a short invite message with deliverables & timeline.</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
            <p className="text-sm font-extrabold">Next best actions</p>
            <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-zinc-400">
              <li>• Invite top 10 suggested creators</li>
              <li>• Publish campaign when ready</li>
              <li>• Track responses in Inbox</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs (✅ add ROI tab, keep existing tabs) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap gap-2">
          <TabBtn
            active={tab === "roi"}
            onClick={() => {
              setTab("roi");
              loadROI();
            }}
          >
            ROI Dashboard
          </TabBtn>

          <TabBtn active={tab === "suggested"} onClick={() => setTab("suggested")}>
            Suggested creators
          </TabBtn>

          <TabBtn active={tab === "invited"} onClick={() => setTab("invited")}>
            Invited / Linked ({campaign.influencers?.length || 0})
          </TabBtn>

          <div className="ml-auto flex gap-2">
            <button
              onClick={async () => {
                await loadAll();
                await loadROI();
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ✅ ROI TAB */}
      {tab === "roi" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-extrabold">Campaign ROI dashboard</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                Premium insight: spend, orders, funnel movement, and creator-wise performance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => window.open(`/api/brand/campaigns/${id}/invoice.pdf`, "_blank")}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800"
              >
                Download Invoice (PDF)
              </button>
              <button
                onClick={loadROI}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Refresh ROI
              </button>
            </div>
          </div>

          {roiLoading ? (
            <div className="mt-4 text-sm text-slate-600 dark:text-zinc-400">Loading ROI...</div>
          ) : roi ? (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPI label="Spend" value={currencyINR(roi.spend)} hint="Total order value for campaign approvals" />
                <KPI label="Orders" value={roi.orders.total} hint={`${roi.orders.pending} pending · ${roi.orders.completed} completed`} />
                <KPI label="Avg order value" value={currencyINR(roi.avgOrderValue)} hint="Average order value per creator/package" />
                <KPI label="₹ / order" value={currencyINR(roi.efficiency.spendPerOrder)} hint="Cost efficiency metric" />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <FunnelCard funnel={roi.funnel} />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                  <h3 className="text-sm font-extrabold">Efficiency</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <Row k="Spend per approved creator" v={currencyINR(roi.efficiency.spendPerApprovedCreator)} />
                    <Row k="Spend per order" v={currencyINR(roi.efficiency.spendPerOrder)} />
                    <Row k="Approved → Orders" v={pct(roi.efficiency.clickToOrder || 0)} />
                  </div>
                  <div className="mt-4 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
                    Tip: Approve creators whose packages fit your budget and have higher completion history.
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <h3 className="text-lg font-extrabold">Creator performance</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">Compare spend and orders creator-wise.</p>

                {roi.creators?.length ? (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-widest text-slate-400 dark:border-zinc-800">
                          <th className="py-3 pr-4">Creator</th>
                          <th className="py-3 pr-4">Status</th>
                          <th className="py-3 pr-4">Orders</th>
                          <th className="py-3 pr-4">Spend</th>
                          <th className="py-3 pr-4">Avg</th>
                          <th className="py-3">Top listings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roi.creators.map((c) => (
                          <tr key={c.influencerId} className="border-b border-slate-100 dark:border-zinc-900">
                            <td className="py-4 pr-4">
                              <div className="min-w-0">
                                <p className="font-extrabold truncate">{c.name || "Creator"}</p>
                                <p className="text-xs text-slate-500 dark:text-zinc-500 truncate">
                                  {c.username ? `@${c.username}` : c.influencerId}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              <Badge>{String(c.status || "—").toUpperCase()}</Badge>
                            </td>
                            <td className="py-4 pr-4 font-semibold">{c.orders}</td>
                            <td className="py-4 pr-4 font-extrabold">{currencyINR(c.spend)}</td>
                            <td className="py-4 pr-4">{currencyINR(c.avgOrderValue)}</td>
                            <td className="py-4">
                              <div className="flex flex-wrap gap-2">
                                {(c.topListings || []).slice(0, 3).map((x) => (
                                  <span
                                    key={x.listingId}
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-zinc-900 dark:text-zinc-200"
                                    title={`${x.count} orders · ${currencyINR(x.price || 0)}`}
                                  >
                                    {x.title} · {x.count}
                                  </span>
                                ))}
                                {!c.topListings?.length ? <span className="text-xs text-slate-500 dark:text-zinc-500">—</span> : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
                    No campaign orders yet. Approve a creator + select a package to generate the first order.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
              ROI data not available yet. Make sure approval creates a campaign order.
            </div>
          )}
        </div>
      ) : null}

      {/* Suggested */}
      {tab === "suggested" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold">Suggested creators</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                Based on your requirements (Collabstr-style matching). Invite creators to start the collaboration.
              </p>
            </div>
            <button
              onClick={loadAll}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              Refresh
            </button>
          </div>

          {suggested.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {suggested.map((u) => (
                <div key={u.id} className="rounded-2xl border border-slate-200 p-5 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">{u.name || "Creator"}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                        {u.city || "—"} · {u.followers.toLocaleString()} followers · score {u.score}
                      </p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
                        Categories: {u.categories?.slice(0, 3).join(", ") || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                        Languages: {u.languages?.slice(0, 3).join(", ") || "—"}
                      </p>
                    </div>
                    <Badge>@{u.username || "creator"}</Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      disabled={invitingId === u.id && submittingInvite === true}
                      onClick={async () => {
                        setInvitingId(u.id);
                        setInviteMsg("");
                        await loadSmartPackage(u.id); // ✅ smart suggestion
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Invite
                    </button>

                    <Link
                      href={`/profile/${u.username || u.id}`}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      View profile
                    </Link>
                  </div>

                  {invitingId === u.id ? (
                    <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-zinc-800 space-y-3">
                      <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Invitation message (optional)</p>
                      <textarea
                        value={inviteMsg}
                        onChange={(e) => setInviteMsg(e.target.value)}
                        className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
                        placeholder={`Hi! We’d like to invite you to "${campaign.name}"...`}
                      />

                      {/* ✅ Smart package panel */}
                      <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold">🧠 Smart package suggestion</p>
                          <button onClick={() => loadSmartPackage(u.id)} className="text-xs font-semibold text-emerald-600 hover:underline">
                            Refresh
                          </button>
                        </div>

                        {smartLoading ? (
                          <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">Analyzing packages…</p>
                        ) : smart?.recommended ? (
                          <div className="mt-3 space-y-2">
                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900">
                              <p className="text-xs text-slate-500 dark:text-zinc-500">Recommended</p>
                              <p className="mt-1 font-extrabold">
                                {smart.recommended.title} · {currencyINR(smart.recommended.price)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                                Score {smart.recommended.score} · {smart.recommended.reasons?.slice(0, 2).join(" · ")}
                              </p>
                            </div>

                            {smart.alternatives?.length ? (
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Alternatives</p>
                                <div className="flex flex-wrap gap-2">
                                  {smart.alternatives.slice(0, 3).map((a) => (
                                    <span
                                      key={a.listingId}
                                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold dark:border-zinc-800"
                                    >
                                      {a.title} · {currencyINR(a.price)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            <p className="text-xs text-slate-500 dark:text-zinc-500">
                              Tip: Use Smart Pick on approval to auto-create the best campaign order.
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">{smart?.note || "No package found for this creator yet."}</p>
                        )}
                      </div>

                      <div className="mt-2 flex gap-2">
                        <button
                          disabled={submittingInvite}
                          onClick={() => invite(u.id)}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          {submittingInvite ? "Sending..." : "Send invite"}
                        </button>
                        <button
                          onClick={() => {
                            setInvitingId(null);
                            setInviteMsg("");
                            setSmart(null);
                          }}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
              No suggestions yet. Try broadening requirements (locations/languages/categories).
            </div>
          )}
        </div>
      ) : null}

      {/* Invited */}
      {tab === "invited" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-extrabold">Invited / linked creators</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">Track who you invited. (We’ll add applied/approved workflow next.)</p>

          {campaign.influencers?.length ? (
            <div className="mt-5 space-y-3">
              {campaign.influencers.map((x: any) => (
                <div
                  key={x.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold truncate">
                      {x.influencerName ? x.influencerName : `Creator (${x.influencerId})`}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                      Status: <span className="font-semibold">{String(x.status || "invited").toUpperCase()}</span>
                    </p>

                    {x.invitedAt ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">Invited on {new Date(x.invitedAt).toLocaleDateString()}</p>
                    ) : null}

                    {/* ✅ NEW: show package id if saved */}
                    {x.packageId ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                        Package: <span className="font-semibold">{String(x.packageId)}</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge>{String(x.status || "invited").toUpperCase()}</Badge>

                    <Link
                      href={`/profile/${x.influencerUsername || x.influencerId}`}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      View profile
                    </Link>

                    {x.threadId ? (
                      <Link
                        href={`/myaccount/inbox/${x.threadId}`}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800"
                      >
                        Message
                      </Link>
                    ) : null}

                    {/* ✅ NEW: Approve UI buttons (keeps everything above untouched) */}
                    <button
                      onClick={() => openApprove(String(x.influencerId))}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => quickStatus(String(x.influencerId), "rejected")}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => quickStatus(String(x.influencerId), "completed")}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      Mark completed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
              No invites yet. Invite from Suggested tab to start.
            </div>
          )}

          {/* ✅ NEW: Approve Modal (does not remove/replace anything) */}
          {approveOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold">Approve creator</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                      Select package + send optional note. This will set status to <b>APPROVED</b>.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setApproveOpen(false);
                      setApproveInfluencerId(null);
                      setApproveNote("");
                      setSelectedPackageId("");
                      setCreatorListings([]);
                      setSmartApprove(null);
                      setListingsError(null);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    Close
                  </button>
                </div>

                {/* Smart Pick */}
                <div className="mt-5 rounded-2xl border border-slate-200 p-5 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-extrabold">🧠 Smart Pick</p>
                    <button
                      onClick={() => approveInfluencerId && loadSmartPackageForApprove(approveInfluencerId)}
                      className="text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      Refresh
                    </button>
                  </div>

                  {smartApproveLoading ? (
                    <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">Analyzing packages…</p>
                  ) : smartApprove?.recommended ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-zinc-900">
                      <p className="text-xs text-slate-500 dark:text-zinc-500">Recommended</p>
                      <p className="mt-1 text-sm font-extrabold">
                        {smartApprove.recommended.title} · {currencyINR(smartApprove.recommended.price)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
                        Score {smartApprove.recommended.score} · {smartApprove.recommended.reasons?.slice(0, 3).join(" · ")}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedPackageId(String(smartApprove.recommended?.listingId || ""))}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700"
                        >
                          Use Smart Pick
                        </button>

                        {smartApprove.alternatives?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {smartApprove.alternatives.slice(0, 2).map((a) => (
                              <button
                                key={a.listingId}
                                onClick={() => setSelectedPackageId(String(a.listingId))}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                                title={a.reasons?.slice(0, 3).join(" · ")}
                              >
                                {a.title} · {currencyINR(a.price)}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">{smartApprove?.note || "No smart pick available."}</p>
                  )}
                </div>

                {/* Package Dropdown */}
                <div className="mt-5 space-y-2">
                  <p className="text-sm font-semibold">Select package</p>
                  {listingsLoading ? (
                    <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
                      Loading creator packages…
                    </div>
                  ) : listingsError ? (
                    <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
                      {listingsError}
                    </div>
                  ) : creatorListings.length ? (
                    <select
                      value={selectedPackageId}
                      onChange={(e) => setSelectedPackageId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <option value="">— Select —</option>
                      {creatorListings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title} · {currencyINR(l.price)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
                      No packages found for this creator.
                    </div>
                  )}
                </div>

                {/* Note */}
                <div className="mt-5 space-y-2">
                  <p className="text-sm font-semibold">Note (optional)</p>
                  <textarea
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
                    placeholder="Example: Please deliver 1 Reel + 2 Stories by Feb 5. Use #BrandHashtag…"
                  />
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    disabled={approveLoading}
                    onClick={approveNow}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {approveLoading ? "Approving..." : "Approve creator"}
                  </button>

                  <button
                    disabled={approveLoading}
                    onClick={() => {
                      setApproveOpen(false);
                      setApproveInfluencerId(null);
                      setApproveNote("");
                      setSelectedPackageId("");
                      setCreatorListings([]);
                      setSmartApprove(null);
                      setListingsError(null);
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-extrabold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
                  This will call: <b>PATCH /api/brand/campaigns/:id/influencers/:influencerId</b> with{" "}
                  <b>{"{ status: 'approved', packageId, note }"}</b>.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function KPI({ label, value, hint }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">{hint}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-sm font-extrabold",
        active ? "bg-emerald-600 text-white" : "border border-slate-200 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500 dark:text-zinc-500">{k}</span>
      <span className="font-semibold text-right">{String(v)}</span>
    </div>
  );
}

function FunnelCard({ funnel }: { funnel: Record<string, number> }) {
  const steps = [
    { k: "invited", label: "Invited" },
    { k: "applied", label: "Applied" },
    { k: "approved", label: "Approved" },
    { k: "completed", label: "Completed" },
    { k: "rejected", label: "Rejected" },
    { k: "withdrawn", label: "Withdrawn" },
  ];

  const max = Math.max(1, ...steps.map((s) => Number(funnel?.[s.k] || 0)));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-lg font-extrabold">Funnel movement</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">See how creators move from invited to approved/completed.</p>

      <div className="mt-5 space-y-3">
        {steps.map((s) => {
          const v = Number(funnel?.[s.k] || 0);
          const w = Math.max(6, Math.round((v / max) * 240));
          return (
            <div key={s.k} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-zinc-200">{s.label}</span>
                <span className="text-slate-500 dark:text-zinc-500">{v}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-900">
                <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${w}px` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
