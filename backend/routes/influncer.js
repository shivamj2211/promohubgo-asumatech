const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { gender, dob, title, description, onboardingStep } = req.body || {};
    const portfolioTitle = req.body?.portfolioTitle ?? req.body?.portfolio_title;
    const portfolioLinks = req.body?.portfolioLinks ?? req.body?.portfolio_links;
    const contentCapabilities =
      req.body?.contentCapabilities ?? req.body?.content_capabilities;
    const shootingStyles = req.body?.shootingStyles ?? req.body?.shooting_styles;
    const editingSelf = req.body?.editingSelf ?? req.body?.editing_self;
    const editingTools = req.body?.editingTools ?? req.body?.editing_tools;
    const editingOther = req.body?.editingOther ?? req.body?.editing_other;
    const adExperience = req.body?.adExperience ?? req.body?.ad_experience;
    const adCountRange = req.body?.adCountRange ?? req.body?.ad_count_range;
    const adPlatforms = req.body?.adPlatforms ?? req.body?.ad_platforms;
    const brandStrengths = req.body?.brandStrengths ?? req.body?.brand_strengths;
    const pricingModel = req.body?.pricingModel ?? req.body?.pricing_model;
    const sampleLinks = req.body?.sampleLinks ?? req.body?.sample_links;
    const boostersConfirmed = req.body?.boostersConfirmed ?? req.body?.boosters_confirmed;
    const data = {};
    if (gender !== undefined) data.gender = gender || null;
    if (dob !== undefined) data.dob = dob || null;
    if (title !== undefined) data.title = title || null;
    if (description !== undefined) data.description = description || null;
    if (portfolioTitle !== undefined) data.portfolioTitle = portfolioTitle || null;
    if (portfolioLinks !== undefined) {
      data.portfolioLinks = Array.isArray(portfolioLinks)
        ? portfolioLinks.map((item) => String(item)).filter(Boolean)
        : [];
    }
    if (contentCapabilities !== undefined) {
      data.contentCapabilities = Array.isArray(contentCapabilities)
        ? contentCapabilities.map((item) => String(item)).filter(Boolean)
        : [];
    }
    if (shootingStyles !== undefined) {
      data.shootingStyles = Array.isArray(shootingStyles)
        ? shootingStyles.map((item) => String(item)).filter(Boolean)
        : [];
    }
    if (editingSelf !== undefined) data.editingSelf = Boolean(editingSelf);
    if (editingTools !== undefined) {
      data.editingTools = Array.isArray(editingTools)
        ? editingTools.map((item) => String(item)).filter(Boolean)
        : [];
    }
    if (editingOther !== undefined) data.editingOther = editingOther || null;
    if (adExperience !== undefined) data.adExperience = adExperience || null;
    if (adCountRange !== undefined) data.adCountRange = adCountRange || null;
    if (adPlatforms !== undefined) {
      data.adPlatforms = Array.isArray(adPlatforms)
        ? adPlatforms.map((item) => String(item)).filter(Boolean)
        : [];
    }
    if (brandStrengths !== undefined) {
      data.brandStrengths = Array.isArray(brandStrengths)
        ? brandStrengths.map((item) => String(item)).filter(Boolean)
        : [];
    }
    if (pricingModel !== undefined) data.pricingModel = pricingModel || null;
    if (sampleLinks !== undefined) {
      data.sampleLinks = Array.isArray(sampleLinks)
        ? sampleLinks.map((item) => String(item)).filter(Boolean)
        : [];
    }
    if (boostersConfirmed !== undefined) {
      data.boostersConfirmed = Boolean(boostersConfirmed);
    }

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
