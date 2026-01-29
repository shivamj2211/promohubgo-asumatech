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

function Badge({ children }: any) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-zinc-900 dark:text-zinc-200">{children}</span>;
}

function currencyINR(v: number) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `₹${v}`;
  }
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
  const [tab, setTab] = useState<"suggested" | "invited">("suggested");
  const [submittingInvite, setSubmittingInvite] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/brand/campaigns/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to load campaign");
      setCampaign(json.campaign);

      const sres = await fetch(`/api/brand/campaigns/${id}/suggested`, { cache: "no-store" });
      const sjson = await sres.json();
      if (sjson?.ok) setSuggested(sjson.suggested || []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadAll();
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
      await loadAll();
      setTab("invited");
    } catch (e: any) {
      alert(e?.message || "Invite failed");
    } finally {
      setSubmittingInvite(false);
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
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI label="Views" value={campaign.stats?.views ?? 0} hint="Total campaign visibility" />
        <KPI label="Clicks" value={campaign.stats?.clicks ?? 0} hint="Interest signal" />
        <KPI label="Saves" value={campaign.stats?.saves ?? 0} hint="Shortlisted by brands" />
        <KPI label="Orders" value={campaign.stats?.orders ?? 0} hint="Purchases generated" />
      </div>

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
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
        Clear budgets + clear deliverables increases acceptance rate.
      </p>
      <p className="mt-3 text-xs">
        Tip: Add a short invite message with deliverables & timeline.
      </p>
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


      {/* Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap gap-2">
          <TabBtn active={tab === "suggested"} onClick={() => setTab("suggested")}>
            Suggested creators
          </TabBtn>
          <TabBtn active={tab === "invited"} onClick={() => setTab("invited")}>
            Invited / Linked ({campaign.influencers?.length || 0})
          </TabBtn>
        </div>
      </div>

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
  onClick={() => setInvitingId(u.id)}
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
                    <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                      <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Invitation message (optional)</p>
                      <textarea
                        value={inviteMsg}
                        onChange={(e) => setInviteMsg(e.target.value)}
                        className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
                        placeholder={`Hi! We’d like to invite you to "${campaign.name}"...`}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => invite(u.id)}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800"
                        >
                          Send invite
                        </button>
                        <button
                          onClick={() => {
                            setInvitingId(null);
                            setInviteMsg("");
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
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Track who you invited. (We’ll add applied/approved workflow next.)
          </p>

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
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Invited on {new Date(x.invitedAt).toLocaleDateString()}
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
    </div>
  </div>
))}

            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
              No invites yet. Invite from Suggested tab to start.
            </div>
          )}
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
