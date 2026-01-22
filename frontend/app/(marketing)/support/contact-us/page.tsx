import Link from "next/link";
import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import ContactForm from "./ContactForm";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const pageTitle = "Contact Us | PromoHubGo";
const pageDescription = "Get help with onboarding, campaigns, or account issues.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/support/contact-us" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/support/contact-us",
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
    { name: "Support", url: `${siteUrl}/support` },
    { name: "Contact Us", url: `${siteUrl}/support/contact-us` }
  ]}
/>
<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-zinc-50">
          Contact Us
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">
          Need help with onboarding, campaigns, verification, or anything else?
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
            <h2 className="font-bold text-slate-900 dark:text-zinc-50">
              Support Information
            </h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-zinc-300">
              Please include screenshots and clear details for faster help.
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
              Typical response time: 24–48 hours
            </p>

            <div className="mt-4 text-sm text-slate-600 dark:text-zinc-300">
              Quick links:
              <div className="mt-2 flex flex-wrap gap-3">
                <Link className="underline" href="/support/faqs">
                  FAQs
                </Link>
                <Link className="underline" href="/support/how-it-works">
                  How it works
                </Link>
                <Link className="underline" href="/discover/find-influencers">
                  Find influencers
                </Link>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </>
  );
}
