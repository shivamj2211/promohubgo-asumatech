const express = require("express");
const pool = require("../db");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function normalizeType(input) {
  const value = String(input || "").toLowerCase();
  if (value === "influencer") return "INFLUENCER";
  if (value === "brand") return "BRAND";
  return null;
}

function buildLocationLabel(location) {
  if (!location) return null;
  const district = location.district;
  const statename = location.statename;
  if (district && statename) return `${district}, ${statename}`;
  return statename || district || null;
}

router.get("/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "");
    if (!userId) return res.status(400).json({ ok: false, error: "Invalid userId" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        influencerProfile: true,
        influencerCategories: true,
        influencerSocials: true,
        influencerMedia: true,
        brandProfile: true,
        brandCategories: true,
        brandPlatforms: true,
        brandMedia: true,
        userLocation: true,
      },
    });

    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    const type = normalizeType(req.query.type) || user.role;
    if (!type || (type !== "INFLUENCER" && type !== "BRAND")) {
      return res.status(400).json({ ok: false, error: "Invalid type" });
    }

    const displayName = user.name || user.username || user.email || "User";
    const locationLabel = buildLocationLabel(user.userLocation);

    if (type === "INFLUENCER") {
      const profile = user.influencerProfile || {};
      const categories = (user.influencerCategories || []).map((item) => item.key);
      const socials = (user.influencerSocials || []).map((item) => ({
        platform: item.platform,
        username: item.username,
        url: item.url,
      }));

      const media = {
        profile: (user.influencerMedia || [])
          .filter((m) => m.type === "PROFILE")
          .map((m) => m.url),
        cover: (user.influencerMedia || [])
          .filter((m) => m.type === "COVER")
          .map((m) => m.url),
      };

      return res.json({
        ok: true,
        data: {
          id: user.id,
          type: "INFLUENCER",
          displayName,
          username: user.username,
          title: profile.title || "Influencer Profile",
          description: profile.description || null,
          locationLabel,
          categories,
          socials,
          media,
        },
      });
    }

    const profile = user.brandProfile || {};
    const categories = (user.brandCategories || []).map((item) => item.key);
    const socials = (user.brandPlatforms || []).map((item) => ({
      platform: item.key,
    }));
    const media = {
      profile: (user.brandMedia || [])
        .filter((m) => m.type === "PROFILE")
        .map((m) => m.url),
      cover: (user.brandMedia || [])
        .filter((m) => m.type === "COVER")
        .map((m) => m.url),
    };

    return res.json({
      ok: true,
      data: {
        id: user.id,
        type: "BRAND",
        displayName,
        username: user.username,
        title: profile.businessType || "Brand",
        description: null,
        locationLabel,
        categories,
        socials,
        media,
      },
    });
  } catch (e) {
    console.error("GET /api/profile ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/:userId/packages", async (req, res) => {
  try {
    const userId = String(req.params.userId || "");
    if (!userId) return res.status(400).json({ ok: false, error: "Invalid userId" });

    const type = normalizeType(req.query.type);
    if (!type) return res.status(400).json({ ok: false, error: "Invalid type" });

    const { rows } = await pool.query(
      `
        SELECT id, title, description, price, currency
        FROM packages
        WHERE "userId" = $1 AND type = $2 AND is_active = true
        ORDER BY sort_order ASC, id ASC
      `,
      [userId, type]
    );

    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("GET /api/profile/packages ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/:userId/contact", requireAuth, async (req, res) => {
  try {
    const userId = String(req.params.userId || "");
    if (!userId) return res.status(400).json({ ok: false, error: "Invalid userId" });

    const type = normalizeType(req.query.type);
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ ok: false, error: "Message is required" });

    const sender = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true },
    });
    if (!sender || sender.role !== "BRAND") {
      return res.status(403).json({ ok: false, error: "Only brands can contact creators" });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) return res.status(404).json({ ok: false, error: "User not found" });
    if (type && type !== target.role) {
      return res.status(400).json({ ok: false, error: "Type mismatch" });
    }
    if (target.role !== "INFLUENCER") {
      return res.status(403).json({ ok: false, error: "Contact is available for influencers only" });
    }

    const seller = await prisma.seller.upsert({
      where: { userId: target.id },
      update: {},
      create: {
        userId: target.id,
        bio: "Influencer collaboration placeholder",
      },
    });

    const category = await prisma.category.upsert({
      where: { slug: "collaboration" },
      update: {},
      create: { name: "Collaboration", slug: "collaboration" },
    });

    let listing = await prisma.listing.findFirst({
      where: { sellerId: seller.id, categoryId: category.id, title: "Collaboration" },
    });
    if (!listing) {
      listing = await prisma.listing.create({
        data: {
          title: "Collaboration",
          description: "Influencer collaboration thread",
          price: 0,
          sellerId: seller.id,
          categoryId: category.id,
        },
      });
    }

    let order = await prisma.order.findFirst({
      where: {
        buyerId: sender.id,
        sellerId: seller.id,
        listingId: listing.id,
        status: "pending",
      },
    });
    if (!order) {
      order = await prisma.order.create({
        data: {
          listingId: listing.id,
          buyerId: sender.id,
          sellerId: seller.id,
          status: "pending",
          totalPrice: 0,
        },
      });
    }

    const created = await prisma.message.create({
      data: {
        content: message,
        senderId: sender.id,
        orderId: order.id,
      },
    });

    return res.json({ ok: true, data: { id: created.id } });
  } catch (e) {
    console.error("POST /api/profile/contact ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
