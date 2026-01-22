import Link from "next/link";
import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const pageTitle = "Engagement Rate Calculator | PromoHubGo";
const pageDescription = "Calculate engagement rate and compare with simple benchmarks.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/tools/engagement-rate-calculator" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/tools/engagement-rate-calculator",
    images: [
      {
        url: `/og?title=${encodeURIComponent(pageTitle)}`,
        width: 1200,
        height: 630,
        alt: pageTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [`/og?title=${encodeURIComponent(pageTitle)}`],
  },
};


export default function Page() {
  return (
    
    <>
<BreadcrumbJsonLd
  items={[
    { name: "Home", url: `${siteUrl}/` },
    { name: "Tools", url: `${siteUrl}/tools` },
    { name: "Engagement Rate Calculator", url: `${siteUrl}/tools/engagement-rate-calculator` }
  ]}
/>
<div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900 text-slate-900 dark:text-zinc-100">
<main className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-3xl font-extrabold tracking-tight">Engagement Rate Calculator</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">Calculate engagement rate and compare with simple benchmarks.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/tools/influencer-price-calculator" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Price Calculator
            </Link>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-bold">Highlights</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-zinc-300">
            <li>• By followers: (likes+comments)/followers</li>
            <li>• By views: engagement/views (video)</li>
          </ul>
        </div>
      </main>
</div>
      </>
);
}