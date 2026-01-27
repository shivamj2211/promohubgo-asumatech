"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  description?: string;
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
  stats?: {
    platforms?: number | null;
    followers?: string | null;
  };
};

/* ================= PAGE ================= */

export default function CreatorProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const [activePlatform, setActivePlatform] =
    useState<"all" | "instagram" | "tiktok" | "ugc">("all");

  const [selectedPackage, setSelectedPackage] =
    useState<Package | null>(null);

  const router = useRouter();

  /* ================= FETCH ================= */

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
  };

  /* ================= MEDIA ================= */

  const gallery = useMemo(() => {
    const imgs = [
      ...(data?.profile?.media?.profile || []),
      ...(data?.profile?.media?.cover || []),
    ];
    return imgs.slice(0, 6);
  }, [data]);

  /* ================= PACKAGES ================= */
const isLoggedIn = Boolean(data?.user?.id);

  const packages: Package[] = [
    {
      id: "p1",
      title: "2 Instagram Stories",
      platform: "instagram",
      price: 150,
      description: "Two-slide Instagram story for your product",
    },
    {
      id: "p2",
      title: "1 Instagram Reel",
      platform: "instagram",
      price: 350,
      description: "Edited reel + story mention",
    },
    {
      id: "p3",
      title: "1 TikTok Video",
      platform: "tiktok",
      price: 250,
      description: "TikTok product video",
    },
    {
      id: "p4",
      title: "UGC Unboxing",
      platform: "ugc",
      price: 125,
      description: "Unboxing + product showcase",
    },
  ];

  const visiblePackages =
    activePlatform === "all"
      ? packages
      : packages.filter((p) => p.platform === activePlatform);

  useEffect(() => {
    if (!selectedPackage && packages.length) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  /* ================= STATES ================= */

  if (loading) return <div className="p-10">Loading…</div>;
  if (!data) return <div className="p-10">Profile not found</div>;

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* ===== TOP BAR ===== */}
        <div className="flex justify-between mb-6 text-sm">
          <button onClick={() => router.back()} className="underline">
            ← Back
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
      alert("Profile link copied to clipboard");
    }
  }}
  className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
  title="Share"
>
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 9v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9" />
    <path d="M12 5l-3-3-3 3" />
    <path d="M9 2v10" />
  </svg>
  <span className="text-sm">Share</span>
</button>

  {/* SAVE / WISHLIST */}
  <button
  onClick={() => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/creator/${params.id}`);
      return;
    }
    toggleSave();
  }}
  className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
  title="Save"
>
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill={saved ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>

  <span className="text-sm">
    {saved ? "Saved" : "Save"}
  </span>
</button>

</div>

        </div>

        {/* ===== HEADER ===== */}
<h1 className="text-3xl font-extrabold">{data.user.name}</h1>

<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
  <span className="text-yellow-500 font-semibold">★ 5.0</span>
  <span>• 9 Reviews</span>

  {data.profile.locationLabel && (
    <span>• {data.profile.locationLabel}</span>
  )}

  {data.user.username && (
    <span>• @{data.user.username}</span>
  )}
</div>


        {/* ===== GRID ===== */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* ========== LEFT COLUMN ========== */}
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
                {(data.profile.categories || []).length ? (
                  data.profile.categories!.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1 text-xs rounded-full border dark:border-zinc-700"
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    No categories shared
                  </span>
                )}
              </div>
            </Section>

            {/* SOCIALS */}
            <Section title="Socials">
              {(data.profile.socials || []).length ? (
                data.profile.socials!.map((s) => (
                  <a
                    key={s.platform}
                    href={s.url || "#"}
                    target="_blank"
                    className="block underline text-sm capitalize"
                  >
                    {s.platform} {s.username && `(@${s.username})`}
                  </a>
                ))
              ) : (
                <span className="text-sm text-slate-500">
                  No socials added
                </span>
              )}
            </Section>

            {/* PACKAGES */}
            <Section title="Packages">
              <div className="flex gap-4 mb-4 text-sm">
                {["all", "instagram", "tiktok", "ugc"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p as any)}
                    className={`capitalize ${
                      activePlatform === p ? "font-bold underline" : ""
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {visiblePackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`w-full flex justify-between rounded-xl border p-4 dark:border-zinc-800 ${
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

            {/* FAQ */}
            <Section title="FAQ">
              <details>
                <summary className="font-semibold cursor-pointer">
                  Who is your audience?
                </summary>
                <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                  Fitness & lifestyle focused audience.
                </p>
              </details>

              <details className="mt-3">
                <summary className="font-semibold cursor-pointer">
                  What brands have you worked with?
                </summary>
                <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                  Clothing, supplements, fitness brands.
                </p>
              </details>
            </Section>

            {/* PORTFOLIO */}
            <Section title="Portfolio">
              <div className="grid grid-cols-2 gap-4">
                {gallery.slice(0, 2).map((img) => (
                  <img
                    key={img}
                    src={img}
                    className="h-56 w-full object-cover rounded-xl"
                  />
                ))}
              </div>
            </Section>

          </div>

          {/* ========== RIGHT COLUMN ========== */}
          <div className="lg:sticky lg:top-6 h-fit border rounded-2xl p-5 dark:border-zinc-800 space-y-4">
            <p className="text-2xl font-extrabold">
              ${selectedPackage?.price ?? 0}
            </p>

            <p className="font-semibold">{selectedPackage?.title}</p>

            <Link
              href={`/contact/${params.id}`}
              className="block bg-pink-600 text-white text-center py-3 rounded-xl font-bold"
            >
              Add to Cart
            </Link>

            <button className="underline text-sm text-slate-500">
              Negotiate a Package
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
    <section className="border rounded-2xl p-5 dark:border-zinc-800 space-y-3">
      <h2 className="font-bold text-lg">{title}</h2>
      {children}
    </section>
  );
}
