import Link from "next/link";
import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const pageTitle = "TikTok Ebook For Brands | PromoHubGo";
const pageDescription = "A practical playbook to brief creators and grow on TikTok.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/resources/tiktok-ebook-brands" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/resources/tiktok-ebook-brands",
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
    { name: "Resources", url: `${siteUrl}/resources` },
    { name: "TikTok Ebook Brands", url: `${siteUrl}/resources/tiktok-ebook-brands` }
  ]}
/>
<div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900 text-slate-900 dark:text-zinc-100">
<main className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-3xl font-extrabold tracking-tight">TikTok Ebook For Brands</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">A practical playbook to brief creators and grow on TikTok.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/discover/find-influencers" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Find Influencers
            </Link>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-bold">Highlights</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-zinc-300">
            <li>• Creator selection</li>
            <li>• Brief structure that works</li>
            <li>• Hooks + retention patterns</li>
            <li>• Measuring performance</li>
          </ul>
        </div>
      </main>
</div>
      </>
);
}