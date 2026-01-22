const express = require("express");
const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma");
const { canChangeUsernameOnceAfterCooldown } = require("../services/usernamePolicy");
const { recordUsernameChange } = require("../services/usernameService");
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
//
// ✅ Policy:
// - Initial set (when username is empty) is allowed anytime.
// - After set: user can change only once, and only after 30 days from signup.
router.patch("/username", requireAuth, async (req, res) => {
  try {
    const { username } = req.body || {};
    if (username === undefined || username === null) {
      return res.status(400).json({ ok: false, error: "Username is required" });
    }

    const trimmed = String(username).trim().toLowerCase();

    if (trimmed.length < 6 || trimmed.length > 18) {
      return res.status(400).json({ ok: false, error: "Username must be between 6 and 18 characters" });
    }
    if (!/^[a-z0-9._]+$/.test(trimmed)) {
      return res.status(400).json({ ok: false, error: "Username may only contain lowercase letters, numbers, dots or underscores" });
    }

    // Load current + evaluate policy
    const policy = await canChangeUsernameOnceAfterCooldown(req.user.id);
    if (!policy.ok) {
      if (policy.reason === "USERNAME_CHANGE_LIMIT") {
        return res.status(403).json({ ok: false, error: "You can change username only once." });
      }
      if (policy.reason === "USERNAME_COOLDOWN") {
        return res.status(403).json({
          ok: false,
          error: `You can change username after ${policy.waitDays} day(s).`,
          waitDays: policy.waitDays,
        });
      }
      return res.status(403).json({ ok: false, error: "Username change not allowed." });
    }

    const currentUsername = policy.currentUsername ? String(policy.currentUsername).trim().toLowerCase() : null;

    // No-op
    if (currentUsername && currentUsername === trimmed) {
      return res.json({ ok: true, username: trimmed });
    }

    // Check if username exists for another user
    const existing = await prisma.user.findUnique({
      where: { username: trimmed },
      select: { id: true },
    });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ ok: false, error: "Username already taken" });
    }

    // Update
    await prisma.user.update({
      where: { id: req.user.id },
      data: { username: trimmed },
    });

    // Record history only when this was a change (not initial set)
    if (!policy.isInitialSet && currentUsername) {
      await recordUsernameChange(req.user.id, currentUsername, trimmed);
    }

    res.json({ ok: true, username: trimmed });
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
      // Disallow clearing username via this endpoint (keeps public links stable)
      const incoming = userPatch.username === null ? "" : String(userPatch.username);
      const trimmed = incoming.trim().toLowerCase();

      if (!trimmed) {
        return res.status(400).json({ ok: false, error: "Username is required" });
      }
      if (trimmed.length < 6 || trimmed.length > 18) {
        return res.status(400).json({ ok: false, error: "Username must be between 6 and 18 characters" });
      }
      if (!/^[a-z0-9._]+$/.test(trimmed)) {
        return res.status(400).json({ ok: false, error: "Username may only contain lowercase letters, numbers, dots or underscores" });
      }

      // Policy enforcement (prevents bypass)
      const policy = await canChangeUsernameOnceAfterCooldown(req.user.id);
      if (!policy.ok) {
        if (policy.reason === "USERNAME_CHANGE_LIMIT") {
          return res.status(403).json({ ok: false, error: "You can change username only once." });
        }
        if (policy.reason === "USERNAME_COOLDOWN") {
          return res.status(403).json({
            ok: false,
            error: `You can change username after ${policy.waitDays} day(s).`,
            waitDays: policy.waitDays,
          });
        }
        return res.status(403).json({ ok: false, error: "Username change not allowed." });
      }

      const currentUsername = policy.currentUsername ? String(policy.currentUsername).trim().toLowerCase() : null;

      // Uniqueness check (only if changing or initial set)
      if (!currentUsername || currentUsername !== trimmed) {
        const existing = await prisma.user.findUnique({
          where: { username: trimmed },
          select: { id: true },
        });
        if (existing && existing.id !== req.user.id) {
          return res.status(409).json({ ok: false, error: "Username already taken" });
        }
      }

      userUpdates.username = trimmed;

      // Record history later (after successful update)
      // We'll attach to req for reuse below
      req._usernameChange = {
        isInitialSet: Boolean(policy.isInitialSet),
        oldUsername: currentUsername,
        newUsername: trimmed,
      };
    }

    if (Object.keys(userUpdates).length) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: userUpdates,
      });

      // ✅ Record username history if username was changed through this endpoint
      if (req._usernameChange && req._usernameChange.oldUsername && !req._usernameChange.isInitialSet) {
        await recordUsernameChange(req.user.id, req._usernameChange.oldUsername, req._usernameChange.newUsername);
      }
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
      const arr = influencerSocials
        .map((s) => ({
          platform: s?.platform ? String(s.platform) : "",
          username: s?.username ? String(s.username) : null,
          url: s?.url ? String(s.url) : null,
        }))
        .filter((s) => s.platform);

      await prisma.influencerSocial.deleteMany({ where: { userId: req.user.id } });
      if (arr.length) {
        await prisma.influencerSocial.createMany({
          data: arr.map((s) => ({ userId: req.user.id, ...s })),
          skipDuplicates: true,
        });
      }
    }

    if (brandProfile) {
      const payload = {
        businessType: brandProfile.businessType ?? null,
        hereToDo: brandProfile.hereToDo ?? null,
        approxBudget: brandProfile.approxBudget ?? null,
        platforms: Array.isArray(brandProfile.platforms)
          ? brandProfile.platforms.map((p) => String(p))
          : undefined,
      };

      await prisma.brandProfile.upsert({
        where: { userId: req.user.id },
        create: {
          userId: req.user.id,
          ...payload,
          platforms: payload.platforms || [],
        },
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

    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/me ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
