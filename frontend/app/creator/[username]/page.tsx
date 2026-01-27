"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

/* ================= TYPES ================= */

type Social = {
  platform: string;
  username?: string | null;
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
    categories?: string[];
    socials?: Social[];
    media?: Media;
    locationLabel?: string | null;
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

  const canSeeAnalytics =
    me?.role === "BRAND" ||
    (me?.username && data?.user?.username && me.username === data.user.username);

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
        <h1 className="text-3xl font-extrabold">{data.user.name}</h1>

        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600 dark:text-zinc-400">
          {data.profile.locationLabel && <span>{data.profile.locationLabel}</span>}
          {data.user.username && <span>- @{data.user.username}</span>}
        </div>

        {/* ===== GRID ===== */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* LEFT */}
          <div className="space-y-6">

            {/* GALLERY */}
            <div className="border rounded-2xl p-3 dark:border-zinc-800">
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
                    No images uploaded
                  </div>
                )}
              </div>
            </div>

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
              {(data.profile.socials || []).map((s) => (
                <a
                  key={s.platform}
                  href={s.url || "#"}
                  target="_blank"
                  className="block underline text-sm capitalize"
                >
                  {s.platform} {s.username && `(@${s.username})`}
                </a>
              ))}
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

            {canSeeAnalytics ? (
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
