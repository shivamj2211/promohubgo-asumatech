const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function upsertUserByEmail(data) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: data,
    create: data,
  });
}

async function ensurePackage({ userId, title, platform, price, description }) {
  const existing = await prisma.influencerPackage.findFirst({
    where: { userId, title },
  });
  if (existing) return existing;

  return prisma.influencerPackage.create({
    data: {
      userId,
      title,
      platform,
      price,
      description,
      isActive: true,
    },
  });
}

async function ensureOrder({ buyerId, sellerId, listingId, totalPrice }) {
  const existing = await prisma.order.findFirst({
    where: { buyerId, listingId },
  });
  if (existing) return existing;

  return prisma.order.create({
    data: {
      buyerId,
      sellerId,
      listingId,
      totalPrice,
      status: "PENDING",
    },
  });
}

async function ensureAnalytics({ packageId, views, clicks, saves, orders }) {
  return prisma.influencerPackageAnalytics.upsert({
    where: { packageId },
    create: {
      packageId,
      views,
      clicks,
      saves,
      orders,
    },
    update: {
      views,
      clicks,
      saves,
      orders,
    },
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("Seed skipped in production.");
    return;
  }

  console.log("Seeding dev-only influencer packages data...");

  const influencerUser = await upsertUserByEmail({
    name: "Dev Influencer",
    email: "dev.influencer@promohubgo.test",
    role: "INFLUENCER",
    isSeller: true,
  });

  const brandUser = await upsertUserByEmail({
    name: "Dev Brand",
    email: "dev.brand@promohubgo.test",
    role: "BRAND",
  });

  const seller = await prisma.seller.upsert({
    where: { userId: influencerUser.id },
    update: {},
    create: { userId: influencerUser.id, bio: "Influencer package seller" },
  });

  const category = await prisma.category.upsert({
    where: { slug: "influencer-package" },
    update: {},
    create: { name: "Influencer Package", slug: "influencer-package" },
  });

  const reelPackage = await ensurePackage({
    userId: influencerUser.id,
    title: "Instagram Reel",
    platform: "instagram",
    price: 150,
    description: "30s reel with caption and 1 link in bio",
  });

  const storyPackage = await ensurePackage({
    userId: influencerUser.id,
    title: "Instagram Stories",
    platform: "instagram",
    price: 75,
    description: "3 stories with swipe-up link",
  });

  const tiktokPackage = await ensurePackage({
    userId: influencerUser.id,
    title: "TikTok Video",
    platform: "tiktok",
    price: 200,
    description: "45s TikTok with CTA",
  });

  await prisma.listing.upsert({
    where: { id: reelPackage.id },
    update: {
      title: reelPackage.title,
      description: reelPackage.description || "Influencer package",
      price: reelPackage.price,
      sellerId: seller.id,
      categoryId: category.id,
    },
    create: {
      id: reelPackage.id,
      title: reelPackage.title,
      description: reelPackage.description || "Influencer package",
      price: reelPackage.price,
      sellerId: seller.id,
      categoryId: category.id,
    },
  });

  await prisma.listing.upsert({
    where: { id: storyPackage.id },
    update: {
      title: storyPackage.title,
      description: storyPackage.description || "Influencer package",
      price: storyPackage.price,
      sellerId: seller.id,
      categoryId: category.id,
    },
    create: {
      id: storyPackage.id,
      title: storyPackage.title,
      description: storyPackage.description || "Influencer package",
      price: storyPackage.price,
      sellerId: seller.id,
      categoryId: category.id,
    },
  });

  await prisma.listing.upsert({
    where: { id: tiktokPackage.id },
    update: {
      title: tiktokPackage.title,
      description: tiktokPackage.description || "Influencer package",
      price: tiktokPackage.price,
      sellerId: seller.id,
      categoryId: category.id,
    },
    create: {
      id: tiktokPackage.id,
      title: tiktokPackage.title,
      description: tiktokPackage.description || "Influencer package",
      price: tiktokPackage.price,
      sellerId: seller.id,
      categoryId: category.id,
    },
  });

  await ensureOrder({
    buyerId: brandUser.id,
    sellerId: seller.id,
    listingId: reelPackage.id,
    totalPrice: reelPackage.price,
  });

  await ensureOrder({
    buyerId: brandUser.id,
    sellerId: seller.id,
    listingId: tiktokPackage.id,
    totalPrice: tiktokPackage.price,
  });

  await Promise.all([
    ensureAnalytics({
      packageId: reelPackage.id,
      views: 12,
      clicks: 4,
      saves: 2,
      orders: 1,
    }),
    ensureAnalytics({
      packageId: storyPackage.id,
      views: 8,
      clicks: 3,
      saves: 1,
      orders: 0,
    }),
    ensureAnalytics({
      packageId: tiktokPackage.id,
      views: 15,
      clicks: 6,
      saves: 3,
      orders: 1,
    }),
  ]);

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
