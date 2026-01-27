const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_STATUS = ["PENDING", "ACCEPTED", "REJECTED"];

async function ensureListingForPackage(pkg) {
  const seller = await prisma.seller.upsert({
    where: { userId: pkg.userId },
    update: {},
    create: {
      userId: pkg.userId,
      bio: "Influencer package seller",
    },
  });

  const category = await prisma.category.upsert({
    where: { slug: "influencer-package" },
    update: {},
    create: { name: "Influencer Package", slug: "influencer-package" },
  });

  const listing = await prisma.listing.upsert({
    where: { id: pkg.id },
    update: {
      title: pkg.title,
      description: pkg.description || "",
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

  return { seller, listing };
}

async function incrementOrderAnalytics({ packageId, userId, ipAddress }) {
  await prisma.$transaction([
    prisma.influencerPackageAnalytics.upsert({
      where: { packageId },
      create: { packageId, orders: 1 },
      update: { orders: { increment: 1 } },
    }),
    prisma.influencerPackageEvent.create({
      data: {
        packageId,
        eventType: "order_created",
        userId,
        ipAddress,
      },
    }),
  ]);
}

function getClientIp(req) {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length) {
    return header.split(",")[0].trim();
  }
  return req.ip || null;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "BRAND") {
      return res.status(403).json({ error: "Only brands can create proposals" });
    }

    const { creatorId, packageId, price, message } = req.body || {};

    if (!creatorId || price === undefined || price === null || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const creator = await prisma.user.findUnique({
      where: { id: String(creatorId) },
      select: { id: true, role: true },
    });

    if (!creator || creator.role !== "INFLUENCER") {
      return res.status(400).json({ error: "Invalid creator" });
    }

    const created = await prisma.proposal.create({
      data: {
        brandId: user.id,
        creatorId: creator.id,
        packageId: packageId ? String(packageId) : null,
        price: Number(price),
        message: String(message),
      },
    });

    return res.json({ ok: true, data: created });
  } catch (err) {
    console.error("Create proposal error:", err);
    return res.status(500).json({ error: "Failed to create proposal" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true },
    });
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const where =
      user.role === "BRAND"
        ? { brandId: user.id }
        : user.role === "INFLUENCER"
        ? { creatorId: user.id }
        : { id: "__none__" };

    const items = await prisma.proposal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        package: true,
        brand: { select: { id: true, name: true, username: true } },
        creator: { select: { id: true, name: true, username: true } },
      },
    });

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("Fetch proposals error:", err);
    return res.status(500).json({ error: "Failed to fetch proposals" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        package: true,
        brand: { select: { id: true, name: true, username: true } },
        creator: { select: { id: true, name: true, username: true } },
      },
    });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    if (![proposal.brandId, proposal.creatorId].includes(req.user.id)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    return res.json({ ok: true, data: proposal });
  } catch (err) {
    console.error("Fetch proposal error:", err);
    return res.status(500).json({ error: "Failed to fetch proposal" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const normalized = String(status || "").toUpperCase();
    if (!ALLOWED_STATUS.includes(normalized)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    if (proposal.creatorId !== req.user.id) {
      return res.status(403).json({ error: "Only the creator can update status" });
    }

    const updated = await prisma.proposal.update({
      where: { id },
      data: { status: normalized },
    });

    return res.json({ ok: true, data: updated });
  } catch (err) {
    console.error("Update proposal error:", err);
    return res.status(500).json({ error: "Failed to update proposal" });
  }
});

router.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    if (![proposal.brandId, proposal.creatorId].includes(req.user.id)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (proposal.status !== "ACCEPTED") {
      return res.json({ ok: true, items: [] });
    }

    const items = await prisma.proposalMessage.findMany({
      where: { proposalId: id },
      orderBy: { createdAt: "asc" },
    });

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("Fetch proposal messages error:", err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body || {};
    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    if (![proposal.brandId, proposal.creatorId].includes(req.user.id)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    if (proposal.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Chat available after acceptance" });
    }

    const created = await prisma.proposalMessage.create({
      data: {
        proposalId: proposal.id,
        senderId: req.user.id,
        content: String(content || "").trim(),
      },
    });

    return res.json({ ok: true, item: created });
  } catch (err) {
    console.error("Create proposal message error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

router.post("/:id/convert", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    if (proposal.brandId !== req.user.id) {
      return res.status(403).json({ error: "Only brand can convert" });
    }
    if (proposal.status !== "ACCEPTED") {
      return res.status(400).json({ error: "Proposal not accepted" });
    }
    if (!proposal.packageId) {
      return res.status(400).json({ error: "Proposal has no package" });
    }

    const pkg = await prisma.influencerPackage.findUnique({
      where: { id: proposal.packageId },
    });
    if (!pkg) return res.status(404).json({ error: "Package not found" });

    const { seller, listing } = await ensureListingForPackage(pkg);

    const existingOrder = await prisma.order.findFirst({
      where: {
        buyerId: proposal.brandId,
        sellerId: seller.id,
        listingId: listing.id,
      },
    });

    const order =
      existingOrder ||
      (await prisma.order.create({
        data: {
          buyerId: proposal.brandId,
          sellerId: seller.id,
          listingId: listing.id,
          status: "PENDING",
          totalPrice: proposal.price || pkg.price,
        },
      }));

    await incrementOrderAnalytics({
      packageId: pkg.id,
      userId: proposal.brandId,
      ipAddress: getClientIp(req),
    });

    return res.json({ ok: true, order });
  } catch (err) {
    console.error("Convert proposal error:", err);
    return res.status(500).json({ error: "Failed to convert proposal" });
  }
});

module.exports = router;
