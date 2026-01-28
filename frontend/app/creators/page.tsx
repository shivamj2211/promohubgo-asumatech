// FILE: app/creators/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type CreatorResult = {
  id: string;
  name: string;
  username?: string | null;
  imageUrl?: string | null;
  boosterPercent: number;
  boosterLevel: string;
  boosterScore: number;
  creatorProfile: {
    city?: string | null;
    primaryNiche?: string | null;
    startingPrice?: number | null;
  };
  badge: string;
  rankReason: string;
};

type CreatorSearchResponse = {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    sort: string;
    boostedOnly: boolean;
    minBoosterPercent: number;
  };
  results: CreatorResult[];
};

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

function formatPrice(value?: number | null) {
  if (value === null || value === undefined) return "Price on request";
  return `INR ${value.toFixed(0)}`;
}

function badgeStyles(badge: string) {
  switch (badge) {
    case "Elite":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "Boosted":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
    case "Growing":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

export default function CreatorsSearchPage() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [boostedOnly, setBoostedOnly] = useState(false);
  const [sort, setSort] = useState("best");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [data, setData] = useState<CreatorSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () =>
      buildQuery({
        q,
        city,
        niche,
        minBudget: minBudget || null,
        maxBudget: maxBudget || null,
        boostedOnly,
        sort,
        page,
        limit,
      }),
    [q, city, niche, minBudget, maxBudget, boostedOnly, sort, page, limit]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch(`/api/creators/search${query}`)
      .then((res) => {
        if (!active) return;
        setData(res as CreatorSearchResponse);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Failed to load creators.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  const results = data?.results ?? [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Find Creators</h1>
          <p className="mt-2 text-sm text-slate-600">
            Boosted profiles rank higher because they have stronger proof and completion.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Search name or username"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="City"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Niche"
              value={niche}
              onChange={(e) => {
                setNiche(e.target.value);
                setPage(1);
              }}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Min budget"
              value={minBudget}
              onChange={(e) => {
                setMinBudget(e.target.value);
                setPage(1);
              }}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Max budget"
              value={maxBudget}
              onChange={(e) => {
                setMaxBudget(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="best">Best</option>
              <option value="boosted">Boosted</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                checked={boostedOnly}
                onChange={(e) => {
                  setBoostedOnly(e.target.checked);
                  setPage(1);
                }}
              />
              Boosted only
            </label>
            {meta ? (
              <span className="text-xs text-slate-500">
                {meta.total} creators - page {meta.page} of {meta.totalPages}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-500">Loading creators...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!meta || meta.page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!meta || meta.page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatorCard({ creator }: { creator: CreatorResult }) {
  const profile = creator.creatorProfile || {};
  const badgeClass = badgeStyles(creator.badge);
  const percent = Math.min(100, Math.max(0, creator.boosterPercent || 0));
  const profileUrl = `/creators/${creator.username || creator.id}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
          {creator.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.imageUrl} alt={creator.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
              {creator.name?.charAt(0) || "C"}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">{creator.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{creator.badge}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">@{creator.username || "creator"}</div>
          <div className="mt-2 text-xs text-slate-600">{creator.rankReason}</div>
        </div>
      </div>

      <div className="mt-4 space-y-1 text-sm text-slate-600">
        <div>
          <span className="font-medium text-slate-700">Niche:</span>{" "}
          {profile.primaryNiche || "General"}
        </div>
        <div>
          <span className="font-medium text-slate-700">City:</span> {profile.city || "Anywhere"}
        </div>
        <div>
          <span className="font-medium text-slate-700">Starting:</span> {formatPrice(profile.startingPrice)}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Booster strength</span>
          <span>{percent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-slate-900" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-2 text-xs font-medium text-slate-700">{creator.boosterLevel}</div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <a
          href={profileUrl}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
        >
          View Profile
        </a>
        <button className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Contact
        </button>
      </div>
    </div>
  );
}
