const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma"); // ✅ ensure backend/prisma.js exists exporting prisma

const router = express.Router();

// helper: accept both snake_case and camelCase
function pickAny(obj, keys, fallback = null) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined) return obj[k];
  }
  return fallback;
}

// PATCH /api/brand/profile
router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const hereToDo = pickAny(req.body, ["hereToDo", "here_to_do"]);
    const approxBudget = pickAny(req.body, ["approxBudget", "approx_budget"]);
    const businessType = pickAny(req.body, ["businessType", "business_type"]);
    const onboardingStep = req.body?.onboardingStep;

    const updateData = {};
    if (hereToDo !== undefined) updateData.hereToDo = hereToDo ?? null;
    if (approxBudget !== undefined) updateData.approxBudget = approxBudget ?? null;
    if (businessType !== undefined) updateData.businessType = businessType ?? null;

    await prisma.brandProfile.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        hereToDo: hereToDo ?? null,
        approxBudget: approxBudget ?? null,
        businessType: businessType ?? null,
      },
      update: updateData,
    });

    // mark role if missing (store enum uppercase)
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        role: "BRAND",
        ...(Number.isInteger(onboardingStep) ? { onboardingStep } : {}),
      },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/brand/profile ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// PUT /api/brand/categories  (replace all)
router.put("/categories", requireAuth, async (req, res) => {
  try {
    const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];
    const onboardingStep = req.body?.onboardingStep;
    if (categories.length > 3) return res.status(400).json({ ok: false, error: "Max 3 categories" });

    await prisma.brandCategory.deleteMany({ where: { userId: req.user.id } });
    if (categories.length) {
      await prisma.brandCategory.createMany({
        data: categories.map((key) => ({ userId: req.user.id, key: String(key) })),
        skipDuplicates: true,
      });
    }

    if (Number.isInteger(onboardingStep)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingStep },
      });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/brand/categories ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// PUT /api/brand/platforms (replace all)
router.put("/platforms", requireAuth, async (req, res) => {
  try {
    const platforms = Array.isArray(req.body?.platforms) ? req.body.platforms : [];
    const onboardingStep = req.body?.onboardingStep;

    await prisma.brandPlatform.deleteMany({ where: { userId: req.user.id } });
    if (platforms.length) {
      await prisma.brandPlatform.createMany({
        data: platforms.map((key) => ({ userId: req.user.id, key: String(key) })),
        skipDuplicates: true,
      });
    }
    if (Number.isInteger(onboardingStep)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingStep },
      });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/brand/platforms ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// replace all media URLs (profile + cover)
router.put("/media", requireAuth, async (req, res) => {
  try {
    const { profileImages, coverImages, onboardingStep } = req.body || {};
    const profile = Array.isArray(profileImages) ? profileImages.filter(Boolean) : null;
    const cover = Array.isArray(coverImages) ? coverImages.filter(Boolean) : null;

    if (profile && profile.length > 3) {
      return res.status(400).json({ ok: false, error: "Profile images max is 3" });
    }
    if (cover && cover.length > 2) {
      return res.status(400).json({ ok: false, error: "Cover images max is 2" });
    }

    const items = [];
    if (profile) {
      profile.forEach((url, idx) => {
        items.push({ userId: req.user.id, type: "PROFILE", url: String(url), sortOrder: idx });
      });
    }
    if (cover) {
      cover.forEach((url, idx) => {
        items.push({ userId: req.user.id, type: "COVER", url: String(url), sortOrder: idx });
      });
    }

    await prisma.brandMedia.deleteMany({ where: { userId: req.user.id } });
    if (items.length) {
      await prisma.brandMedia.createMany({ data: items });
    }

    if (Number.isInteger(onboardingStep)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingStep },
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/brand/media ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
