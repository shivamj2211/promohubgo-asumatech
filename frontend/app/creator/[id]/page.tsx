"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Pkg = { code: string; title: string; price: number; desc?: string };
type Influencer = {
  id: string;
  full_name: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  profile_image_url?: string;
  instagram_handle?: string;
  instagram_followers?: number;
  is_verified?: boolean;
};

export default function CreatorProfilePage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiFetch(`/api/public/influencers/${params.id}`);
        if (!alive) return;
        setInfluencer(data.influencer);
        setPackages(data.packages || []);
        setSelected((data.packages?.[0]?.code as string) || "");
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setInfluencer(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.id]);

  const selectedPkg = useMemo(
    () => packages.find((p) => p.code === selected) || null,
    [packages, selected]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-8 w-52 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="h-80 rounded-2xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-80 rounded-2xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-slate-600 dark:text-zinc-300">Profile not found.</p>
          <Link className="mt-4 inline-block underline" href="/listings">
            Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const location = [influencer.city, influencer.state, influencer.country].filter(Boolean).join(", ");
  const ig = influencer.instagram_handle ? `@${influencer.instagram_handle.replace(/^@/, "")}` : null;

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* top nav spacing */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {influencer.full_name}
              {influencer.is_verified ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Verified
                </span>
              ) : null}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-zinc-300">
              {location ? <span>{location}</span> : null}
              {ig ? <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-zinc-900">{ig}</span> : null}
              {typeof influencer.instagram_followers === "number" ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-zinc-900">
                  {Intl.NumberFormat("en", { notation: "compact" }).format(influencer.instagram_followers)} followers
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/listings"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              Back
            </Link>

            <Link
              href={`/contact/${influencer.id}`}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700"
            >
              Contact
            </Link>
          </div>
        </div>

        {/* main layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* left */}
          <div className="space-y-6">
            {/* gallery */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={influencer.profile_image_url || "https://picsum.photos/600/600"}
                      alt={influencer.full_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://picsum.photos/800/600?1" alt="" className="h-40 w-full rounded-2xl object-cover sm:h-full" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://picsum.photos/800/600?2" alt="" className="h-40 w-full rounded-2xl object-cover sm:h-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* about */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-extrabold">About</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-zinc-300">
                {influencer.bio || "No bio added yet."}
              </p>

              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800">
                <h3 className="text-base font-extrabold">Packages</h3>

                <div className="mt-3 space-y-3">
                  {packages.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => setSelected(p.code)}
                      className={[
                        "w-full rounded-2xl border p-4 text-left transition",
                        p.code === selected
                          ? "border-emerald-600 bg-emerald-600/5"
                          : "border-slate-200 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-extrabold">{p.title}</div>
                        <div className="font-extrabold">${p.price}</div>
                      </div>
                      {p.desc ? (
                        <div className="mt-1 text-sm text-slate-600 dark:text-zinc-400">{p.desc}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* right side panel */}
          <div className="lg:sticky lg:top-6 h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-2xl font-extrabold">
              ${selectedPkg?.price ?? 0}
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Select package</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none dark:border-zinc-800 dark:bg-zinc-950"
              >
                {packages.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.title}
                  </option>
                ))}
              </select>

              <p className="mt-3 text-sm text-slate-600 dark:text-zinc-400">
                {selectedPkg?.desc || "Package details will appear here."}
              </p>

              <Link
                href={`/contact/${influencer.id}?pkg=${encodeURIComponent(selected)}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-pink-500 px-4 py-3 text-sm font-extrabold text-white hover:opacity-95"
              >
                Contact / Request
              </Link>

              <div className="mt-3 text-center text-xs text-slate-500 dark:text-zinc-500">
                Mobile friendly • Dark/Light ready
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
