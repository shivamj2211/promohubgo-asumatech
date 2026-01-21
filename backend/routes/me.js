const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        influencerProfile: true,
        influencerCategories: true,
        influencerSocials: true,
        userLocation: true,
        brandProfile: true,
        brandCategories: true,
        brandPlatforms: true,
        influencerMedia: true,
        brandMedia: true,
      },
    });
    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        countryCode: user.countryCode,
        role: user.role,
        isAdmin: user.isAdmin,
        isLocked: user.isLocked,
        onboardingStep: user.onboardingStep,
        onboardingCompleted: user.onboardingCompleted,
        isPremium: false,
        influencerProfile: user.influencerProfile,
        influencerCategories: user.influencerCategories,
        influencerSocials: user.influencerSocials,
        userLocation: user.userLocation,
        brandProfile: user.brandProfile,
        brandCategories: user.brandCategories,
        brandPlatforms: user.brandPlatforms,
        influencerMedia: user.influencerMedia,
        brandMedia: user.brandMedia,
      },
    });
  } catch (e) {
    console.error("GET /api/me ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.patch("/role", requireAuth, async (req, res) => {
  const { role } = req.body || {};
  const normalized = String(role || "").toLowerCase();
if (!["influencer", "brand"].includes(normalized)) {
  return res.status(400).json({ ok: false, error: "Invalid role" });
}
const dbRole = normalized === "influencer" ? "INFLUENCER" : "BRAND";

  await prisma.user.update({
    where: { id: req.user.id },
    data: { role: dbRole },
  });
  res.json({ ok: true });
});

// Save location (from your Location page)
router.patch("/location", requireAuth, async (req, res) => {
  try {
    const {
      pincode,
      state,
      district,
      city_label,
      area,
      full_address,
      lat,
      lng,
      onboardingStep,
    } = req.body || {};

    await prisma.userLocation.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        pincode: pincode || null,
        statename: state || null,
        district: district || null,
        officename: area || null,
        latitude: lat ? String(lat) : null,
        longitude: lng ? String(lng) : null,
        fullAddress: full_address || city_label || null,
      },
      update: {
        pincode: pincode || null,
        statename: state || null,
        district: district || null,
        officename: area || null,
        latitude: lat ? String(lat) : null,
        longitude: lng ? String(lng) : null,
        fullAddress: full_address || city_label || null,
      },
    });

    if (Number.isInteger(onboardingStep)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingStep },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/me/location ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// Set or update the user's username.
// PATCH /api/me/username { username: string }
router.patch("/username", requireAuth, async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) {
      return res.status(400).json({ ok: false, error: "Username is required" });
    }

    const trimmed = String(username).trim().toLowerCase();

    if (trimmed.length < 6 || trimmed.length > 18) {
      return res.status(400).json({ ok: false, error: "Username must be between 6 and 18 characters" });
    }
    if (!/^[a-z0-9._]+$/.test(trimmed)) {
      return res.status(400).json({ ok: false, error: "Username may only contain lowercase letters, numbers, dots or underscores" });
    }

    // Check if username exists for another user
    const existing = await prisma.user.findUnique({
      where: { username: trimmed },
      select: { id: true },
    });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ ok: false, error: "Username already taken" });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { username: trimmed },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/me/username ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});


module.exports = router;
