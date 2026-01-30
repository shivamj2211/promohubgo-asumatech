const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * GET /api/creators/:id/listings
 * Returns creator listings for package dropdown.
 * Brand must be logged-in (requireAuth).
 */
router.get("/:id/listings", requireAuth, async (req, res) => {
  try {
    const influencerUserId = String(req.params.id || "");

    const seller = await prisma.seller.findFirst({
      where: { userId: influencerUserId },
      select: { id: true },
    });

    if (!seller) return res.json({ ok: true, listings: [] });

    const listings = await prisma.listing.findMany({
      where: { sellerId: seller.id },
      select: { id: true, title: true, price: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ ok: true, listings });
  } catch (e) {
    console.error("GET /api/creators/:id/listings ERROR:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

module.exports = router;
