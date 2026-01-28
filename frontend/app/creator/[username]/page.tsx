"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/footer/site-footer";
import {
  Facebook,
  Instagram,
  MessageCircle,
  Send,
  Twitter,
  Youtube,
} from "lucide-react";

/* ================= TYPES ================= */

type Social = {
  platform: string;
  username?: string | null;
  followers?: string | null;
  url?: string | null;
};

type Media = {
  profile?: string[];
  cover?: string[];
};

type Package = {
  id: string;
  title: string;
  platform: string;
  price: number;
  description?: string | null;
};

type Analytics = {
  packageId: string;
  views: number;
  clicks: number;
  saves: number;
  orders: number;
};

type AnalyticsResponse = {
  ok?: boolean;
  items?: Analytics[];
};

type PublicProfile = {
  type: "influencer" | "brand";
  user: {
    id: string;
    name: string;
    username?: string | null;
  };
  profile: {
    description?: string | null;
    portfolioTitle?: string | null;
    portfolioLinks?: string[];
    categories?: string[];
    socials?: Social[];
    media?: Media;
    locationLabel?: string | null;
  };
  boosters?: {
    boosterPercent: number;
    boosterLevel: string;
    boosterScore: number;
    completedBoosters: Array<{
      key?: string | null;
      title?: string | null;
      category?: string | null;
      points?: number | null;
    }>;
  } | null;
  verified?: {
    platforms: string[];
    hasVerifiedSocial: boolean;
  };
  socialAnalytics?: {
    tiers: {
      public: string[];
      connected: string[];
      advanced: string[];
    };
    connections: Array<{
      platform: string;
      stats: any;
      createdAt: string;
      lastFetchedAt?: string | null;
      fetchStatus?: string | null;
      errorMessage?: string | null;
    }>;
  };
};

/* ================= PAGE ================= */

export default function CreatorProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const router = useRouter();

  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, Analytics>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [activePlatform, setActivePlatform] = useState<string>("all");

  const [saved, setSaved] = useState(false);
  const hasTrackedView = useRef(false);

  const [me, setMe] = useState<{ id: string; role?: string | null; username?: string | null } | null>(
    null
  );
  const isLoggedIn = Boolean(me?.id);

  const track = async (eventType: string, packageId?: string | null) => {
    if (!packageId) return;
    try {
      await apiFetch("/api/analytics/track", {
        method: "POST",
        body: JSON.stringify({ packageId, eventType }),
      });
    } catch {
      // no-op: analytics should not block UI
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch("/api/me");
        if (!active) return;
        if (res?.ok && res?.user?.id) {
          setMe({
            id: res.user.id,
            role: res.user.role || null,
            username: res.user.username || null,
          });
        } else {
          setMe(null);
        }
      } catch {
        if (active) setMe(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /* ================= FETCH PROFILE ================= */

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/public/influencers/${params.username}`);
        if (!alive) return;
        if (res?.shouldRedirect && res?.canonicalUsername) {
          router.replace(`/creator/${res.canonicalUsername}`);
          return;
        }
        setData(res);
      } catch {
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.username]);

  /* ================= FETCH PACKAGES ================= */

  useEffect(() => {
    if (!params.username) return;

    apiFetch(`/api/public/packages/${params.username}`)
      .then((res) => {
        setPackages(res || []);
      })
      .catch(() => setPackages([]));
  }, [params.username]);

  useEffect(() => {
    if (!params.username) return;
    let active = true;
    (async () => {
      try {
        setAnalyticsLoading(true);
        const res = (await apiFetch(
          `/api/analytics/packages/${params.username}`
        )) as AnalyticsResponse;
        if (!active) return;
        const items: Analytics[] = Array.isArray(res?.items) ? res.items : [];
        const map = items.reduce<Record<string, Analytics>>((acc, item) => {
          acc[item.packageId] = {
            packageId: item.packageId,
            views: item.views || 0,
            clicks: item.clicks || 0,
            saves: item.saves || 0,
            orders: item.orders || 0,
          };
          return acc;
        }, {});
        setAnalytics(map);
      } catch {
        if (active) setAnalytics({});
      } finally {
        if (active) setAnalyticsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.username]);

  useEffect(() => {
    if (!selectedPackage && packages.length) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  useEffect(() => {
    if (selectedPackage && !hasTrackedView.current) {
      hasTrackedView.current = true;
      track("profile_view", selectedPackage.id);
    }
  }, [selectedPackage]);

  /* ================= WISHLIST ================= */

  useEffect(() => {
    const savedList = JSON.parse(localStorage.getItem("wishlist") || "[]");
    setSaved(savedList.includes(params.username));
  }, [params.username]);

  const toggleSave = () => {
    const list = JSON.parse(localStorage.getItem("wishlist") || "[]");
    const updated = saved
      ? list.filter((id: string) => id !== params.username)
      : [...list, params.username];
    localStorage.setItem("wishlist", JSON.stringify(updated));
    setSaved(!saved);
    if (!saved) {
      track("package_save", selectedPackage?.id);
    }
  };

  /* ================= MEDIA ================= */

  const gallery = useMemo(() => {
    const imgs = [
      ...(data?.profile?.media?.profile || []),
      ...(data?.profile?.media?.cover || []),
    ];
    return imgs.slice(0, 6);
  }, [data]);

  const portfolioLinks = useMemo(() => {
    const links = Array.isArray(data?.profile?.portfolioLinks)
      ? data?.profile?.portfolioLinks
      : [];
    return links.filter((link) => String(link || "").trim());
  }, [data]);

  const socialCards = useMemo(() => {
    const socials = data?.profile?.socials || [];
    return socials
      .map((s) => ({
        ...s,
        key: String(s.platform || "").toLowerCase(),
      }))
      .filter((s) => s.key);
  }, [data]);

  const showBoostersBonus =
    data?.boosters && typeof data.boosters.boosterPercent === "number" && data.boosters.boosterPercent >= 70;

  const platformTabs = useMemo(() => {
    const unique = Array.from(
      new Set(
        packages
          .map((p) => String(p.platform || "").trim().toLowerCase())
          .filter(Boolean)
      )
    );
    return ["all", ...unique];
  }, [packages]);

  const visiblePackages =
    activePlatform === "all"
      ? packages
      : packages.filter(
          (p) =>
            String(p.platform || "").trim().toLowerCase() ===
            activePlatform
        );

  useEffect(() => {
    if (!platformTabs.includes(activePlatform)) {
      setActivePlatform("all");
    }
  }, [platformTabs, activePlatform]);

  const selectedAnalytics = selectedPackage
    ? analytics[selectedPackage.id]
    : null;
  const conversionRate =
    selectedAnalytics && selectedAnalytics.clicks > 0
      ? Math.round((selectedAnalytics.orders / selectedAnalytics.clicks) * 100)
      : 0;

  /* ================= STATES ================= */

  if (loading) return <div className="p-10">Loading...</div>;
  if (!data) return <div className="p-10">Profile not found</div>;

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* ===== TOP BAR ===== */}
        <div className="flex justify-between mb-6 text-sm">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 underline"
          >
            - Back
          </button>

          <div className="flex gap-3">
            {/* SHARE */}
            <button
              onClick={async () => {
                const url = window.location.href;
                if (navigator.share) {
                  await navigator.share({ url });
                } else {
                  await navigator.clipboard.writeText(url);
                  alert("Profile link copied");
                }
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <span>Share</span>
            </button>

            {/* SAVE */}
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  router.push(`/login?redirect=/creator/${params.username}`);
                  return;
                }
                toggleSave();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <span>{saved ? "Saved" : "Save"}</span>
            </button>
          </div>
        </div>

        {/* ===== HEADER ===== */}
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
          <h1 className="text-3xl font-extrabold">{data.user.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600 dark:text-zinc-400">
            {data.user.username && (
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs dark:border-zinc-800">
                @{data.user.username}
              </span>
            )}
            {data.profile.locationLabel && (
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs dark:border-zinc-800">
                {data.profile.locationLabel}
              </span>
            )}
            {data.verified?.hasVerifiedSocial ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                Verified
              </span>
            ) : null}
          </div>

          {socialCards.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {socialCards.map((s) => (
                <a
                  key={s.platform}
                  href={s.url || "#"}
                  target="_blank"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-zinc-900 dark:text-zinc-200">
                    {s.key === "instagram" ? (
                      <Instagram className="h-5 w-5" />
                    ) : s.key === "youtube" ? (
                      <Youtube className="h-5 w-5" />
                    ) : s.key === "facebook" ? (
                      <Facebook className="h-5 w-5" />
                    ) : s.key === "x" ? (
                      <Twitter className="h-5 w-5" />
                    ) : s.key === "telegram" ? (
                      <Send className="h-5 w-5" />
                    ) : s.key === "whatsapp" ? (
                      <MessageCircle className="h-5 w-5" />
                    ) : (
                      <Instagram className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold capitalize">
                      {s.key === "x" ? "X (Twitter)" : s.platform}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">
                      {s.followers ? `${s.followers} followers` : "Followers hidden"}
                      {s.username ? ` · @${s.username}` : ""}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {/* ===== GRID ===== */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* LEFT */}
          <div className="space-y-6">

            {/* PORTFOLIO */}
            <Section title="Portfolio">
              {data.profile.portfolioTitle ? (
                <p className="text-sm text-slate-600 dark:text-zinc-400">
                  {data.profile.portfolioTitle}
                </p>
              ) : null}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {gallery.length ? (
                  gallery.map((img, i) => (
                    <img
                      key={img}
                      src={img}
                      className={`object-cover rounded-xl w-full ${
                        i === 0 ? "col-span-2 row-span-2 h-[360px]" : "h-40"
                      }`}
                    />
                  ))
                ) : (
                  <div className="col-span-full h-64 flex items-center justify-center text-sm text-slate-500">
                    No portfolio items yet.
                  </div>
                )}
              </div>
              {portfolioLinks.length ? (
                <div className="mt-4 space-y-2 text-sm">
                  {portfolioLinks.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      className="block rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              ) : null}
            </Section>

            {/* ABOUT */}
            <Section title="About">
              {data.profile.description || "No description provided."}
            </Section>

            {/* CATEGORIES */}
            <Section title="Categories">
              <div className="flex flex-wrap gap-2">
                {(data.profile.categories || []).map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1 text-xs rounded-full border dark:border-zinc-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </Section>

            {/* SOCIALS */}
            <Section title="Socials">
              {socialCards.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {socialCards.map((s) => (
                    <a
                      key={s.platform}
                      href={s.url || "#"}
                      target="_blank"
                      className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-zinc-800"
                    >
                      <span className="font-semibold capitalize">
                        {s.key === "x" ? "X (Twitter)" : s.platform}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-400">
                        {s.followers ? `${s.followers} followers` : "Followers hidden"}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No socials added.</div>
              )}
            </Section>

            {/* PACKAGES */}
            <Section title="Packages">
              <div className="flex gap-4 mb-4 text-sm">
                {platformTabs.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p as any)}
                    className={`${
                      activePlatform === p ? "font-bold underline" : ""
                    }`}
                  >
                    {p === "instagram"
                      ? "Instagram"
                      : p === "tiktok"
                      ? "TikTok"
                      : p === "youtube"
                      ? "YouTube"
                      : p === "facebook"
                      ? "Facebook"
                      : p === "x"
                      ? "X (Twitter)"
                      : p === "telegram"
                      ? "Telegram"
                      : p === "whatsapp"
                      ? "WhatsApp"
                      : p}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {visiblePackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => {
                      setSelectedPackage(pkg);
                      track("package_click", pkg.id);
                    }}
                    className={`w-full flex justify-between rounded-xl border p-4 ${
                      selectedPackage?.id === pkg.id
                        ? "border-black dark:border-white"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{pkg.title}</p>
                      <p className="text-xs text-slate-500">
                        {pkg.description}
                      </p>
                    </div>
                    <span className="font-bold">${pkg.price}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Analytics">
              {analyticsLoading ? (
                <div className="text-sm text-slate-500">Loading analytics...</div>
              ) : selectedAnalytics ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div className="border rounded-xl p-3">
                    <p className="text-xs text-slate-500">Views</p>
                    <p className="font-bold text-lg">{selectedAnalytics.views}</p>
                  </div>
                  <div className="border rounded-xl p-3">
                    <p className="text-xs text-slate-500">Clicks</p>
                    <p className="font-bold text-lg">{selectedAnalytics.clicks}</p>
                  </div>
                  <div className="border rounded-xl p-3">
                    <p className="text-xs text-slate-500">Saves</p>
                    <p className="font-bold text-lg">{selectedAnalytics.saves}</p>
                  </div>
                  <div className="border rounded-xl p-3">
                    <p className="text-xs text-slate-500">Orders</p>
                    <p className="font-bold text-lg">{selectedAnalytics.orders}</p>
                  </div>
                  <div className="border rounded-xl p-3">
                    <p className="text-xs text-slate-500">Conversion</p>
                    <p className="font-bold text-lg">{conversionRate}%</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  No analytics yet for this package.
                </div>
              )}
            </Section>

            {showBoostersBonus ? (
              <Section title="Boosters Bonus">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                    {data?.boosters?.boosterLevel || "Boosted"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    {data?.boosters?.boosterPercent ?? 0}% boosted
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data?.boosters?.completedBoosters || []).map((b) => (
                    <span
                      key={`${b.key || b.title}`}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700"
                    >
                      {b.title || b.key}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}

            {data.socialAnalytics?.connections?.length ? (
              <Section title="Verified Social Analytics">
                <div className="space-y-4">
                  {data.socialAnalytics.connections.map((conn) => {
                    const stats = conn.stats || {};
                    return (
                      <div key={conn.platform} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold capitalize">{conn.platform}</div>
                          <div className="text-xs text-slate-500">
                            {conn.fetchStatus || "OK"}
                            {conn.lastFetchedAt ? ` • Updated ${new Date(conn.lastFetchedAt).toLocaleDateString()}` : ""}
                          </div>
                        </div>
                        {conn.errorMessage ? (
                          <div className="mt-2 text-xs text-rose-600">{conn.errorMessage}</div>
                        ) : null}
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          {stats.username ? (
                            <div>
                              <div className="text-xs text-slate-500">Handle</div>
                              <div className="font-semibold">@{stats.username}</div>
                            </div>
                          ) : null}
                          {stats.channelTitle ? (
                            <div>
                              <div className="text-xs text-slate-500">Channel</div>
                              <div className="font-semibold">{stats.channelTitle}</div>
                            </div>
                          ) : null}
                          {stats.followersCount !== undefined && stats.followersCount !== null ? (
                            <div>
                              <div className="text-xs text-slate-500">Followers</div>
                              <div className="font-semibold">{stats.followersCount}</div>
                            </div>
                          ) : null}
                          {stats.subscribersCount !== undefined && stats.subscribersCount !== null ? (
                            <div>
                              <div className="text-xs text-slate-500">Subscribers</div>
                              <div className="font-semibold">{stats.subscribersCount}</div>
                            </div>
                          ) : null}
                          {stats.totalViews !== undefined && stats.totalViews !== null ? (
                            <div>
                              <div className="text-xs text-slate-500">Total Views</div>
                              <div className="font-semibold">{stats.totalViews}</div>
                            </div>
                          ) : null}
                          {stats.mediaCount !== undefined && stats.mediaCount !== null ? (
                            <div>
                              <div className="text-xs text-slate-500">Posts</div>
                              <div className="font-semibold">{stats.mediaCount}</div>
                            </div>
                          ) : null}
                          {stats.videoCount !== undefined && stats.videoCount !== null ? (
                            <div>
                              <div className="text-xs text-slate-500">Videos</div>
                              <div className="font-semibold">{stats.videoCount}</div>
                            </div>
                          ) : null}
                          {stats.accountType ? (
                            <div>
                              <div className="text-xs text-slate-500">Account Type</div>
                              <div className="font-semibold">{stats.accountType}</div>
                            </div>
                          ) : null}
                          {stats.publishedAt ? (
                            <div>
                              <div className="text-xs text-slate-500">Channel Created</div>
                              <div className="font-semibold">{new Date(stats.publishedAt).toLocaleDateString()}</div>
                            </div>
                          ) : null}
                          {stats.country ? (
                            <div>
                              <div className="text-xs text-slate-500">Country</div>
                              <div className="font-semibold">{stats.country}</div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            ) : null}

          </div>

          {/* RIGHT */}
          <div className="lg:sticky lg:top-6 h-fit border rounded-2xl p-5 space-y-4">
            <p className="text-2xl font-extrabold">
              ${selectedPackage?.price ?? 0}
            </p>
            <p className="font-semibold">{selectedPackage?.title}</p>

            <button
              onClick={async () => {
                if (!isLoggedIn) {
                  router.push(`/login?redirect=/creator/${params.username}`);
                  return;
                }

                if (!selectedPackage) return;

                await apiFetch("/api/cart/add", {
                  method: "POST",
                  body: JSON.stringify({
                    packageId: selectedPackage.id,
                    quantity: 1,
                  }),
                });

                router.push(`/checkout`);
              }}
              className="block w-full bg-pink-600 text-white text-center py-3 rounded-xl font-bold"
            >
              Add to Cart
            </button>

          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

/* ================= REUSABLE ================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border rounded-2xl p-5 space-y-3">
      <h2 className="font-bold text-lg">{title}</h2>
      {children}
    </section>
  );
}
