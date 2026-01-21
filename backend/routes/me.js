const express = require("express");
const bcrypt = require("bcrypt");
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
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        countryCode: user.countryCode,
        role: user.role,
        isAdmin: user.isAdmin,
        isLocked: user.isLocked,
        onboardingStep: user.onboardingStep,
        onboardingCompleted: user.onboardingCompleted,
        isPremium: Boolean(user.isPremium),
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

router.patch("/", requireAuth, async (req, res) => {
  try {
    const {
      user: userPatch = {},
      influencerProfile = null,
      influencerCategories = null,
      influencerSocials = null,
      brandProfile = null,
      brandCategories = null,
      brandPlatforms = null,
      userLocation = null,
    } = req.body || {};

    const userUpdates = {};
    if (userPatch.name !== undefined) userUpdates.name = userPatch.name ? String(userPatch.name) : null;
    if (userPatch.phone !== undefined) userUpdates.phone = userPatch.phone ? String(userPatch.phone) : null;
    if (userPatch.countryCode !== undefined) userUpdates.countryCode = userPatch.countryCode ? String(userPatch.countryCode) : null;

    if (userPatch.username !== undefined) {
      const trimmed = userPatch.username ? String(userPatch.username).trim().toLowerCase() : null;
      if (trimmed) {
        if (trimmed.length < 6 || trimmed.length > 18) {
          return res.status(400).json({ ok: false, error: "Username must be between 6 and 18 characters" });
        }
        if (!/^[a-z0-9._]+$/.test(trimmed)) {
          return res.status(400).json({ ok: false, error: "Username may only contain lowercase letters, numbers, dots or underscores" });
        }
        const existing = await prisma.user.findUnique({
          where: { username: trimmed },
          select: { id: true },
        });
        if (existing && existing.id !== req.user.id) {
          return res.status(409).json({ ok: false, error: "Username already taken" });
        }
      }
      userUpdates.username = trimmed;
    }

    if (Object.keys(userUpdates).length) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: userUpdates,
      });
    }

    if (userLocation) {
      const payload = {
        pincode: userLocation.pincode ? String(userLocation.pincode) : null,
        district: userLocation.district ? String(userLocation.district) : null,
        statename: userLocation.statename ? String(userLocation.statename) : null,
        officename: userLocation.officename ? String(userLocation.officename) : null,
        fullAddress: userLocation.fullAddress ? String(userLocation.fullAddress) : null,
        latitude: userLocation.latitude ? String(userLocation.latitude) : null,
        longitude: userLocation.longitude ? String(userLocation.longitude) : null,
      };

      await prisma.userLocation.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, ...payload },
        update: payload,
      });
    }

    if (influencerProfile) {
      const payload = {
        gender: influencerProfile.gender ?? null,
        dob: influencerProfile.dob ?? null,
        title: influencerProfile.title ?? null,
        description: influencerProfile.description ?? null,
        languages: Array.isArray(influencerProfile.languages)
          ? influencerProfile.languages.map((lang) => String(lang))
          : undefined,
      };

      await prisma.influencerProfile.upsert({
        where: { userId: req.user.id },
        create: {
          userId: req.user.id,
          ...payload,
          languages: payload.languages || [],
        },
        update: payload,
      });
    }

    if (Array.isArray(influencerCategories)) {
      const arr = influencerCategories.map((c) => String(c)).filter(Boolean);
      await prisma.influencerCategory.deleteMany({ where: { userId: req.user.id } });
      if (arr.length) {
        await prisma.influencerCategory.createMany({
          data: arr.map((key) => ({ userId: req.user.id, key })),
          skipDuplicates: true,
        });
      }
    }

    if (Array.isArray(influencerSocials)) {
      await prisma.influencerSocial.deleteMany({ where: { userId: req.user.id } });
      const items = influencerSocials
        .map((s) => ({
          platform: String(s.platform || "").toLowerCase(),
          username: s.username ? String(s.username) : null,
          followers: s.followers ? String(s.followers) : null,
          url: s.url ? String(s.url) : null,
        }))
        .filter((s) => s.platform);
      if (items.length) {
        await prisma.influencerSocial.createMany({
          data: items.map((s) => ({ ...s, userId: req.user.id })),
          skipDuplicates: true,
        });
      }
    }

    if (brandProfile) {
      const payload = {
        hereToDo: brandProfile.hereToDo ?? null,
        approxBudget: brandProfile.approxBudget ?? null,
        businessType: brandProfile.businessType ?? null,
      };
      await prisma.brandProfile.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, ...payload },
        update: payload,
      });
    }

    if (Array.isArray(brandCategories)) {
      const arr = brandCategories.map((c) => String(c)).filter(Boolean);
      await prisma.brandCategory.deleteMany({ where: { userId: req.user.id } });
      if (arr.length) {
        await prisma.brandCategory.createMany({
          data: arr.map((key) => ({ userId: req.user.id, key })),
          skipDuplicates: true,
        });
      }
    }

    if (Array.isArray(brandPlatforms)) {
      const arr = brandPlatforms.map((c) => String(c)).filter(Boolean);
      await prisma.brandPlatform.deleteMany({ where: { userId: req.user.id } });
      if (arr.length) {
        await prisma.brandPlatform.createMany({
          data: arr.map((key) => ({ userId: req.user.id, key })),
          skipDuplicates: true,
        });
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/me ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: "Current and new password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      return res.status(400).json({ ok: false, error: "Password login not enabled" });
    }

    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) return res.status(401).json({ ok: false, error: "Invalid current password" });

    const hash = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: hash },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/me/change-password ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/change-email", requireAuth, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: "Email is required" });

    const lower = String(email).toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: lower }, select: { id: true } });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { email: lower },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/me/change-email ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});


module.exports = router;
