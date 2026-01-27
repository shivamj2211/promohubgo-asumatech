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
  platform: "instagram" | "tiktok" | "ugc";
  price: number;
  description?: string | null;
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
  params: { id: string };
}) {
  const router = useRouter();

  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const [activePlatform, setActivePlatform] =
    useState<"all" | "instagram" | "tiktok" | "ugc">("all");

  const [saved, setSaved] = useState(false);
  const hasTrackedView = useRef(false);

  const isLoggedIn = Boolean(data?.user?.id);

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

  /* ================= FETCH PROFILE ================= */

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/public/influencers/${params.id}`);
        if (!alive) return;
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
  }, [params.id]);

  /* ================= FETCH PACKAGES ================= */

  useEffect(() => {
    if (!params.id) return;

    apiFetch(`/api/influencer-packages/public/${params.id}`)
      .then((res) => {
        setPackages(res || []);
      })
      .catch(() => setPackages([]));
  }, [params.id]);

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
    setSaved(savedList.includes(params.id));
  }, [params.id]);

  const toggleSave = () => {
    const list = JSON.parse(localStorage.getItem("wishlist") || "[]");
    const updated = saved
      ? list.filter((id: string) => id !== params.id)
      : [...list, params.id];
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

  const visiblePackages =
    activePlatform === "all"
      ? packages
      : packages.filter((p) => p.platform === activePlatform);

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
                  router.push(`/login?redirect=/creator/${params.id}`);
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
                {["all", "instagram", "tiktok", "ugc"].map((p) => (
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
                  router.push(`/login?redirect=/creator/${params.id}`);
                  return;
                }

                if (!selectedPackage) return;

                const order = await apiFetch("/api/orders", {
                  method: "POST",
                  body: JSON.stringify({
                    packageId: selectedPackage.id,
                  }),
                });

                await track("order_created", selectedPackage.id);

                console.log("Created order:", order);

                router.push(`/dashboard/orders`);
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
