import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/analytics/analytics";
import Chatbot from "@/components/chatbot/Chatbot";
import ScrollToTop from "@/components/ScrollToTop";
const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "PromoHubGo - Influencer Marketplace",
  description: "Connect with top influencers and brands",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PromoHubGo",
    title: "PromoHubGo - Influencer Marketplace",
    description: "Connect with top influencers and brands",
    url: "/",
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
    title: "PromoHubGo - Influencer Marketplace",
    description: "Connect with top influencers and brands",
    images: [`/og?title=${encodeURIComponent("PromoHubGo")}`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-100`}>
        <Analytics />
        <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
          {children}
          <Chatbot />
           <ScrollToTop />
        </main>
      </body>
    </html>
  );
}
