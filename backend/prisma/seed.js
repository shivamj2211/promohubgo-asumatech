"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const PLATFORM_LIST = [
    "instagram",
    "tiktok",
    "ugc",
    "youtube",
    "facebook",
    "x",
    "telegram",
    "whatsapp",
];
function platformUrl(platform, handle, index) {
    if (platform === "instagram")
        return `https://instagram.com/${handle}`;
    if (platform === "tiktok")
        return `https://tiktok.com/@${handle}`;
    if (platform === "youtube")
        return `https://youtube.com/@${handle}`;
    if (platform === "facebook")
        return `https://facebook.com/${handle}`;
    if (platform === "x")
        return `https://x.com/${handle}`;
    if (platform === "telegram")
        return `https://t.me/${handle}`;
    if (platform === "whatsapp")
        return `https://wa.me/91${index}00000000`;
    return `https://example.com/${handle}`;
}
async function ensureInfluencerUser(seed) {
    return prisma.user.upsert({
        where: { username: seed.username },
        update: {},
        create: {
            name: seed.name,
            email: seed.email,
            username: seed.username,
            role: "INFLUENCER",
            onboardingCompleted: true,
            isSeller: true,
        },
    });
}
async function ensureBrandUser() {
    return prisma.user.upsert({
        where: { username: "demo_brand" },
        update: {},
        create: {
            name: "Demo Brand",
            email: "brand@demo.local",
            username: "demo_brand",
            role: "BRAND",
            onboardingCompleted: true,
        },
    });
}
async function ensureInfluencerProfile(userId, seed, index) {
    await prisma.influencerProfile.upsert({
        where: { userId },
        update: {},
        create: {
            userId,
            gender: seed.gender,
            dob: seed.dob,
            languages: seed.languages,
            title: seed.title,
            description: seed.description,
        },
    });
    for (const key of seed.categories) {
        await prisma.influencerCategory.upsert({
            where: { userId_key: { userId, key } },
            update: {},
            create: { userId, key },
        });
    }
    for (const platform of PLATFORM_LIST) {
        const handle = seed.username;
        const followers = `${10 + index * 3}k`;
        const url = platformUrl(platform, handle, index);
        await prisma.influencerSocial.upsert({
            where: { userId_platform: { userId, platform } },
            update: { username: handle, followers, url },
            create: { userId, platform, username: handle, followers, url },
        });
    }
    const existingProfileMedia = await prisma.influencerMedia.findFirst({
        where: { userId, type: "PROFILE" },
    });
    if (!existingProfileMedia) {
        await prisma.influencerMedia.create({
            data: {
                userId,
                type: "PROFILE",
                url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                sortOrder: 1,
            },
        });
    }
    const existingCoverMedia = await prisma.influencerMedia.findFirst({
        where: { userId, type: "COVER" },
    });
    if (!existingCoverMedia) {
        await prisma.influencerMedia.create({
            data: {
                userId,
                type: "COVER",
                url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
                sortOrder: 1,
            },
        });
    }
    await prisma.userLocation.upsert({
        where: { userId },
        update: {},
        create: {
            userId,
            district: seed.location.district,
            statename: seed.location.statename,
            fullAddress: `${seed.location.district}, ${seed.location.statename}`,
        },
    });
}
async function ensureBrandProfile(userId) {
    await prisma.brandProfile.upsert({
        where: { userId },
        update: {},
        create: {
            userId,
            hereToDo: "Find influencers for a one-time campaign",
            approxBudget: "$500-$1000",
            businessType: "E-commerce",
        },
    });
    await prisma.brandCategory.upsert({
        where: { userId_key: { userId, key: "beauty" } },
        update: {},
        create: { userId, key: "beauty" },
    });
    await prisma.brandPlatform.upsert({
        where: { userId_key: { userId, key: "instagram" } },
        update: {},
        create: { userId, key: "instagram" },
    });
}
async function ensurePackages(userId, index) {
    const templates = [
        { title: "Instagram Reel", platform: "instagram", price: 150, description: "30-second Reel with CTA." },
        { title: "TikTok Video", platform: "tiktok", price: 140, description: "Short TikTok trend video." },
        { title: "UGC Bundle", platform: "ugc", price: 220, description: "Three UGC videos for ads." },
        { title: "YouTube Integration", platform: "youtube", price: 420, description: "60-second integration." },
        { title: "Facebook Reel", platform: "facebook", price: 160, description: "Facebook short-form reel." },
        { title: "X Thread", platform: "x", price: 90, description: "Sponsored X thread." },
        { title: "Telegram Post", platform: "telegram", price: 70, description: "Telegram community post." },
        { title: "WhatsApp Community", platform: "whatsapp", price: 80, description: "WhatsApp community promo." },
    ];
    const results = [];
    for (const t of templates) {
        const existing = await prisma.influencerPackage.findFirst({
            where: { userId, title: t.title, platform: t.platform },
        });
        if (existing) {
            results.push(existing);
            continue;
        }
        const created = await prisma.influencerPackage.create({
            data: {
                userId,
                title: t.title,
                platform: t.platform,
                price: t.price + index * 5,
                description: t.description,
                isActive: true,
            },
        });
        results.push(created);
    }
    return results;
}
async function ensureOrdersAndEarnings({ creatorUserId, brandUserId, packages, }) {
    const seller = await prisma.seller.upsert({
        where: { userId: creatorUserId },
        update: {},
        create: { userId: creatorUserId, bio: "Influencer package seller" },
    });
    const category = await prisma.category.upsert({
        where: { slug: "influencer-package" },
        update: {},
        create: { name: "Influencer Package", slug: "influencer-package" },
    });
    for (const pkg of packages.slice(0, 2)) {
        await prisma.listing.upsert({
            where: { id: pkg.id },
            update: {
                title: pkg.title,
                description: pkg.description || "Influencer package",
                price: pkg.price,
                sellerId: seller.id,
                categoryId: category.id,
            },
            create: {
                id: pkg.id,
                title: pkg.title,
                description: pkg.description || "Influencer package",
                price: pkg.price,
                sellerId: seller.id,
                categoryId: category.id,
            },
        });
        const existingOrder = await prisma.order.findFirst({
            where: { buyerId: brandUserId, listingId: pkg.id },
        });
        const order = existingOrder ||
            (await prisma.order.create({
                data: {
                    listingId: pkg.id,
                    buyerId: brandUserId,
                    sellerId: seller.id,
                    totalPrice: pkg.price,
                    status: "COMPLETED",
                },
            }));
        const existingEarning = await prisma.creatorEarning.findFirst({
            where: { orderId: order.id },
        });
        if (!existingEarning) {
            const grossAmount = Number(order.totalPrice || 0);
            const platformFee = Number((grossAmount * 0.1).toFixed(2));
            const netAmount = Number((grossAmount - platformFee).toFixed(2));
            await prisma.creatorEarning.create({
                data: {
                    creatorId: creatorUserId,
                    orderId: order.id,
                    packageId: pkg.id,
                    grossAmount,
                    platformFee,
                    netAmount,
                },
            });
        }
        await prisma.payment.upsert({
            where: { orderId: order.id },
            update: {},
            create: {
                orderId: order.id,
                provider: "MOCK",
                amount: order.totalPrice,
                status: "SUCCESS",
                currency: "INR",
            },
        });
    }
}
async function ensureAnalytics({ creatorUserId, packages }) {
    const existing = await prisma.analyticsEvent.count({
        where: { entity: "PROFILE", entityId: creatorUserId },
    });
    if (existing > 0)
        return;
    await prisma.analyticsEvent.createMany({
        data: [
            { entity: "PROFILE", entityId: creatorUserId, event: "VIEW" },
            { entity: "PROFILE", entityId: creatorUserId, event: "VIEW" },
            { entity: "PROFILE", entityId: creatorUserId, event: "VIEW" },
        ],
    });
    for (const pkg of packages) {
        await prisma.analyticsEvent.createMany({
            data: [
                { entity: "PACKAGE", entityId: pkg.id, event: "VIEW" },
                { entity: "PACKAGE", entityId: pkg.id, event: "CLICK" },
                { entity: "PACKAGE", entityId: pkg.id, event: "SAVE" },
                { entity: "PACKAGE", entityId: pkg.id, event: "ORDER" },
            ],
        });
    }
}
async function main() {
    const brand = await ensureBrandUser();
    await ensureBrandProfile(brand.id);
    const creators = [
        {
            username: "demo_creator_1",
            name: "Aarav Mehta",
            email: "creator1@demo.local",
            gender: "male",
            dob: "1996-02-14",
            languages: ["english", "hindi"],
            title: "Tech & Lifestyle Creator",
            description: "Tech reviews, gadgets, and lifestyle hacks.",
            categories: ["tech", "lifestyle", "ugc"],
            location: { district: "Mumbai", statename: "Maharashtra" },
        },
        {
            username: "demo_creator_2",
            name: "Anaya Singh",
            email: "creator2@demo.local",
            gender: "female",
            dob: "1998-07-09",
            languages: ["english", "punjabi"],
            title: "Beauty & Skincare",
            description: "Skincare routines and beauty product reviews.",
            categories: ["beauty", "skincare", "ugc"],
            location: { district: "Delhi", statename: "Delhi" },
        },
        {
            username: "demo_creator_3",
            name: "Rohit Sharma",
            email: "creator3@demo.local",
            gender: "male",
            dob: "1995-11-21",
            languages: ["english", "hindi"],
            title: "Fitness Coach",
            description: "Workout routines and nutrition tips.",
            categories: ["fitness", "sports", "health"],
            location: { district: "Pune", statename: "Maharashtra" },
        },
        {
            username: "demo_creator_4",
            name: "Isha Kapoor",
            email: "creator4@demo.local",
            gender: "female",
            dob: "1997-03-04",
            languages: ["english", "hindi"],
            title: "Travel Creator",
            description: "Travel guides and city explorations.",
            categories: ["travel", "lifestyle", "food"],
            location: { district: "Jaipur", statename: "Rajasthan" },
        },
        {
            username: "demo_creator_5",
            name: "Kabir Das",
            email: "creator5@demo.local",
            gender: "male",
            dob: "1994-09-12",
            languages: ["english", "bengali"],
            title: "Gaming Streamer",
            description: "Gaming clips and live streams.",
            categories: ["gaming", "entertainment", "tech"],
            location: { district: "Kolkata", statename: "West Bengal" },
        },
        {
            username: "demo_creator_6",
            name: "Priya Nair",
            email: "creator6@demo.local",
            gender: "female",
            dob: "1999-01-19",
            languages: ["english", "tamil"],
            title: "Food Creator",
            description: "Restaurant reviews and recipes.",
            categories: ["food", "lifestyle", "travel"],
            location: { district: "Chennai", statename: "Tamil Nadu" },
        },
        {
            username: "demo_creator_7",
            name: "Varun Khanna",
            email: "creator7@demo.local",
            gender: "male",
            dob: "1993-05-28",
            languages: ["english", "hindi"],
            title: "Finance & Business",
            description: "Startup tips and finance explainers.",
            categories: ["finance", "business", "education"],
            location: { district: "Gurugram", statename: "Haryana" },
        },
        {
            username: "demo_creator_8",
            name: "Neha Rao",
            email: "creator8@demo.local",
            gender: "female",
            dob: "1996-12-02",
            languages: ["english", "marathi"],
            title: "Fashion Creator",
            description: "Outfit ideas and fashion reels.",
            categories: ["fashion", "lifestyle", "beauty"],
            location: { district: "Mumbai", statename: "Maharashtra" },
        },
        {
            username: "demo_creator_9",
            name: "Arjun Patel",
            email: "creator9@demo.local",
            gender: "male",
            dob: "1995-06-30",
            languages: ["english", "gujarati"],
            title: "Auto & Tech",
            description: "Cars, bikes, and tech gadgets.",
            categories: ["auto", "tech", "reviews"],
            location: { district: "Ahmedabad", statename: "Gujarat" },
        },
        {
            username: "demo_creator_10",
            name: "Zoya Ali",
            email: "creator10@demo.local",
            gender: "female",
            dob: "2000-04-17",
            languages: ["english", "urdu"],
            title: "Wellness Creator",
            description: "Mindfulness and wellness routines.",
            categories: ["wellness", "health", "lifestyle"],
            location: { district: "Hyderabad", statename: "Telangana" },
        },
    ];
    for (let i = 0; i < creators.length; i += 1) {
        const seed = creators[i];
        const influencer = await ensureInfluencerUser(seed);
        await ensureInfluencerProfile(influencer.id, seed, i + 1);
        const packages = await ensurePackages(influencer.id, i + 1);
        await ensureOrdersAndEarnings({
            creatorUserId: influencer.id,
            brandUserId: brand.id,
            packages,
        });
        await ensureAnalytics({ creatorUserId: influencer.id, packages });
    }
    console.log("Seed complete: 10 creators + demo_brand");
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
