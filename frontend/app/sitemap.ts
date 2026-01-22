import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const routes = [
    "/",
    "/login",
    "/signup",
    "/explore",
    // Marketing / footer pages
    "/blog",
    "/resources",
    "/affiliate",
    "/resources/tiktok-ebook-brands",
    "/resources/influencer-marketing-report-2025",
    "/tools/influencer-price-calculator",
    "/tools/instagram-fake-follower-checker",
    "/tools/tiktok-fake-follower-checker",
    "/tools/engagement-rate-calculator",
    "/tools/campaign-brief-template",
    "/tools/contract-template",
    "/analytics",
    "/discover/find-influencers",
    "/discover/top-influencers",
    "/discover/search-influencers",
    "/discover/buy-shoutouts",
    "/support/contact-us",
    "/support/how-it-works",
    "/support/faqs",
    "/legal/privacy",
    "/legal/terms",
    "/legal/security",
  ];

  const now = new Date();

  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
