import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const prismaAny = prisma as any;

const boosters = [
  { key: "connect-instagram", title: "Connect Instagram", description: "Verify your Instagram and unlock metrics.", category: "Verification", points: 30, sortOrder: 1, isActive: true },
  { key: "connect-youtube", title: "Connect YouTube", description: "Bring subscribers and channel stats.", category: "Verification", points: 25, sortOrder: 2, isActive: true },

  { key: "portfolio", title: "Add Portfolio Samples", description: "Upload or link best work.", category: "Profile Power", points: 20, sortOrder: 3, isActive: true },
  { key: "niche", title: "Pick Your Primary Niche", description: "Primary and secondary niches.", category: "Profile Power", points: 15, sortOrder: 4, isActive: true },
  { key: "content-types", title: "Content Types You Create", description: "Reels, UGC ads, demos, posters, etc.", category: "Profile Power", points: 15, sortOrder: 5, isActive: true },

  { key: "audience-geo", title: "Audience Locations", description: "Country and state/city focus.", category: "Audience", points: 15, sortOrder: 6, isActive: true },
  { key: "audience-age", title: "Audience Age Groups", description: "Age buckets (18-24, 25-34...).", category: "Audience", points: 10, sortOrder: 7, isActive: true },

  { key: "brand-exp", title: "Brand Collaboration History", description: "Worked with brands before?", category: "Trust", points: 15, sortOrder: 8, isActive: true },
  { key: "invoice", title: "Invoice / GST Details", description: "Invoice/GST increases trust.", category: "Trust", points: 10, sortOrder: 9, isActive: true },

  { key: "avg-performance", title: "Average Performance Buckets", description: "Add ranges for views/likes.", category: "Performance", points: 20, sortOrder: 10, isActive: true },
  { key: "response-time", title: "Fast Response Badge", description: "Set response time range.", category: "Performance", points: 10, sortOrder: 11, isActive: true },
  { key: "posting-consistency", title: "Posting Consistency", description: "Daily/weekly frequency.", category: "Performance", points: 10, sortOrder: 12, isActive: true },
];

async function main() {
  for (const b of boosters) {
    await prismaAny.booster.upsert({
      where: { key: b.key },
      create: b,
      update: { ...b },
    });
  }
  console.log("Boosters seeded");
}

main().finally(async () => prisma.$disconnect());
