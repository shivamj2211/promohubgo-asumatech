import type { Metadata } from "next";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/footer/site-footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    siteName: "PromoHubGo",
    images: [
      {
        url: `/og?title=${encodeURIComponent("PromoHubGo")}`,
        width: 1200,
        height: 630,
        alt: "PromoHubGo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [`/og?title=${encodeURIComponent("PromoHubGo")}`],
  },
};

function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PromoHubGo",
    url: siteUrl,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PromoHubGo",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/discover/search-influencers`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd data={org} />
      <JsonLd data={website} />

      <div className="min-h-screen">
        <TopNav />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          {children}
        </div>
        <SiteFooter />
      </div>
    </>
  );
}
