"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Social = { platform: string; username?: string | null; url?: string | null; followers?: string | null };
type Media = { profile?: string[]; cover?: string[] };

type PublicProfile = {
  type: "influencer" | "brand";
  user: {
    id: string;
    name: string;
    username?: string | null;
    email?: string | null;
    role?: string | null;
    isPremium?: boolean;
  };
  profile: {
    title?: string | null;
    description?: string | null;
    categories?: string[];
    socials?: Social[];
    media?: Media;
    locationLabel?: string | null;
    here_to_do?: string | null;
    approx_budget?: string | null;
    business_type?: string | null;
    platforms?: string[];
  };
  stats?: {
    platforms?: number | null;
    followers?: string | null;
    businessType?: string | null;
    budgetRange?: string | null;
  };
};

export default function CreatorProfilePage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicProfile | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/public/influencers/${params.id}`);
        if (!alive) return;
        setData(res as PublicProfile);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.id]);

  const profileName = data?.user?.name || "Profile";
  const profileTitle = data?.profile?.title || data?.profile?.business_type || "Profile";
  const location = data?.profile?.locationLabel || null;

  const media = useMemo(() => {
    const profile = data?.profile?.media?.profile || [];
    const cover = data?.profile?.media?.cover || [];
    return [...profile, ...cover].slice(0, 4);
  }, [data]);

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

  if (!data) {
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

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {profileName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-zinc-300">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide dark:bg-zinc-900">
                {data.type === "influencer" ? "Influencer" : "Brand"}
              </span>
              {location ? <span>{location}</span> : null}
              {data.user.username ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-zinc-900">
                  @{data.user.username}
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
              href={`/contact/${params.id}`}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700"
            >
              Contact
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="grid gap-3 sm:grid-cols-2">
                {media.length ? (
                  media.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className="h-40 w-full rounded-2xl object-cover" />
                  ))
                ) : (
                  <div className="col-span-2 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                    No media added yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-extrabold">About</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-zinc-300">
                {data.profile.description || "No description added yet."}
              </p>

              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800">
                <h3 className="text-base font-extrabold">Categories</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data.profile.categories || []).length ? (
                    data.profile.categories?.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                      >
                        {cat}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-zinc-400">
                      No categories shared.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-6 h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Profile title</p>
              <p className="mt-1 text-xl font-extrabold">{profileTitle}</p>
            </div>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-zinc-900">
              {data.type === "influencer" ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-400">Platforms</span>
                    <span className="font-semibold">{data.stats?.platforms ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-400">Followers</span>
                    <span className="font-semibold">{data.stats?.followers || "N/A"}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-400">Business type</span>
                    <span className="font-semibold">{data.stats?.businessType || "Brand"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-400">Budget</span>
                    <span className="font-semibold">{data.stats?.budgetRange || "N/A"}</span>
                  </div>
                </>
              )}
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-zinc-300">Socials</h3>
              <div className="mt-3 space-y-2">
                {(data.profile.socials || []).length ? (
                  data.profile.socials?.map((social) => (
                    <div key={`${social.platform}-${social.username || ""}`} className="text-sm">
                      <span className="font-semibold capitalize">{social.platform}</span>
                      {social.username ? ` @${social.username}` : ""}
                      {social.url ? (
                        <>
                          {" "}
                          <a
                            href={social.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:underline"
                          >
                            visit
                          </a>
                        </>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-zinc-400">No socials added.</p>
                )}
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 dark:text-zinc-500">
              Mobile friendly - Dark/Light ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
