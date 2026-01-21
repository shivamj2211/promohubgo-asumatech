const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { gender, dob, title, description, onboardingStep } = req.body || {};
    const data = {};
    if (gender !== undefined) data.gender = gender || null;
    if (dob !== undefined) data.dob = dob || null;
    if (title !== undefined) data.title = title || null;
    if (description !== undefined) data.description = description || null;

    await prisma.influencerProfile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, ...data },
      update: data,
    });

    if (Number.isInteger(onboardingStep)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingStep },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/influencer/profile ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// replace all languages (normalized)
router.put("/languages", requireAuth, async (req, res) => {
  try {
    const { languages, onboardingStep } = req.body || {};
    const arr = Array.isArray(languages) ? languages.map((l) => String(l)) : [];

    await prisma.influencerProfile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, languages: arr },
      update: { languages: arr },
    });

    if (Number.isInteger(onboardingStep)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingStep },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/influencer/languages ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// replace all categories
router.put("/categories", requireAuth, async (req, res) => {
  try {
    const { categories, onboardingStep } = req.body || {};
    const arr = Array.isArray(categories) ? categories.map((c) => String(c)) : [];
    if (arr.length > 5) return res.status(400).json({ ok: false, error: "Max 5 categories" });

    await prisma.influencerCategory.deleteMany({ where: { userId: req.user.id } });
    if (arr.length) {
      await prisma.influencerCategory.createMany({
        data: arr.map((key) => ({ userId: req.user.id, key })),
        skipDuplicates: true,
      });
    }

    if (Number.isInteger(onboardingStep)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingStep },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/influencer/categories ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// replace all socials
router.put("/socials", requireAuth, async (req, res) => {
  try {
    const { socials, onboardingStep } = req.body || {};
    const arr = Array.isArray(socials) ? socials : [];

    await prisma.influencerSocial.deleteMany({ where: { userId: req.user.id } });
    if (arr.length) {
      await prisma.influencerSocial.createMany({
        data: arr.map((s) => ({
          userId: req.user.id,
          platform: String(s.platform),
          username: s.username || null,
          followers: s.follower_range || s.followers || null,
          url: s.url || null,
        })),
        skipDuplicates: true,
      });
    }

    if (Number.isInteger(onboardingStep)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingStep },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/influencer/socials ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// replace all media URLs (profile + cover)
router.put("/media", requireAuth, async (req, res) => {
  try {
    const { profileImages, coverImages, onboardingStep } = req.body || {};
    const profile = Array.isArray(profileImages) ? profileImages.filter(Boolean) : null;
    const cover = Array.isArray(coverImages) ? coverImages.filter(Boolean) : null;

    if (profile && (profile.length < 1 || profile.length > 3)) {
      return res.status(400).json({ ok: false, error: "Profile images must be between 1 and 3" });
    }
    if (cover && (cover.length < 1 || cover.length > 2)) {
      return res.status(400).json({ ok: false, error: "Cover images must be between 1 and 2" });
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

    await prisma.influencerMedia.deleteMany({ where: { userId: req.user.id } });
    if (items.length) {
      await prisma.influencerMedia.createMany({ data: items });
    }

    if (Number.isInteger(onboardingStep)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingStep },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/influencer/media ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
