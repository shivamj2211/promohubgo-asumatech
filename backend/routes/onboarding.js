const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function addCheck(state, ok, key, label, step) {
  state.total += 1;
  if (ok) {
    state.completed += 1;
    return;
  }
  state.missing.push({ key, label, step });
}

router.get("/status", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        influencerProfile: true,
        influencerCategories: true,
        influencerSocials: true,
        influencerMedia: true,
        influencerPackages: true,
        userLocation: true,
        brandProfile: true,
        brandCategories: true,
        brandPlatforms: true,
        brandMedia: true,
      },
    });

    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    const role = user.role || null;
    const state = { total: 0, completed: 0, missing: [] };

    if (role === "INFLUENCER") {
      const profile = user.influencerProfile || {};
      const location = user.userLocation || {};
      const socials = Array.isArray(user.influencerSocials) ? user.influencerSocials : [];
      const media = Array.isArray(user.influencerMedia) ? user.influencerMedia : [];
      const packages = Array.isArray(user.influencerPackages) ? user.influencerPackages : [];

      addCheck(state, Boolean(profile.gender), "gender", "Add gender", 1);
      addCheck(state, Boolean(profile.dob), "dob", "Add date of birth", 1);
      addCheck(
        state,
        Array.isArray(profile.languages) && profile.languages.length > 0,
        "languages",
        "Add languages",
        1
      );

      addCheck(state, Boolean(location.pincode), "pincode", "Add pincode", 2);
      addCheck(state, Boolean(location.statename), "state", "Add state", 2);
      addCheck(state, Boolean(location.district), "district", "Add district", 2);
      addCheck(state, Boolean(location.officename), "area", "Add area / locality", 2);

      const hasSocial = socials.some(
        (s) => s.username && s.followers && s.url
      );
      addCheck(state, hasSocial, "socials", "Add at least one social channel", 3);

      addCheck(state, Boolean(profile.description), "description", "Add description", 4);
      addCheck(state, Boolean(profile.title), "title", "Add profile title", 5);

      const hasCover = media.some((m) => m.type === "COVER");
      addCheck(state, hasCover, "coverImages", "Add cover images", 6);

      const hasPortfolioLinks =
        Array.isArray(profile.portfolioLinks) && profile.portfolioLinks.length > 0;
      addCheck(state, hasPortfolioLinks, "portfolio", "Add portfolio links", 7);

      addCheck(state, packages.length > 0, "packages", "Create a package", 8);

      addCheck(
        state,
        typeof profile.boostersConfirmed === "boolean",
        "boosters",
        "Complete Boosters section",
        9
      );
    }

    if (role === "BRAND") {
      const profile = user.brandProfile || {};
      const location = user.userLocation || {};
      const categories = Array.isArray(user.brandCategories) ? user.brandCategories : [];
      const platforms = Array.isArray(user.brandPlatforms) ? user.brandPlatforms : [];

      addCheck(state, Boolean(location.pincode), "pincode", "Add pincode", 2);
      addCheck(state, Boolean(location.statename), "state", "Add state", 2);
      addCheck(state, Boolean(location.district), "district", "Add district", 2);
      addCheck(state, Boolean(location.officename), "area", "Add area / locality", 2);

      addCheck(state, Boolean(profile.hereToDo), "hereToDo", "Select here to do", 3);
      addCheck(state, Boolean(profile.approxBudget), "approxBudget", "Add budget", 4);
      addCheck(state, Boolean(profile.businessType), "businessType", "Add business type", 5);
      addCheck(state, categories.length > 0, "categories", "Select categories", 6);
      addCheck(state, platforms.length > 0, "platforms", "Select target platforms", 7);
    }

    const percent = state.total === 0 ? 0 : Math.round((state.completed / state.total) * 100);
    const nextStep = state.missing.length
      ? Math.min(...state.missing.map((item) => item.step))
      : null;

    return res.json({
      ok: true,
      role,
      completion: {
        percent,
        completed: state.completed,
        total: state.total,
      },
      missing: state.missing,
      nextStep,
    });
  } catch (e) {
    console.error("GET /api/onboarding/status ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/complete", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { influencerProfile: true },
    });
    const role = user?.role || null;
    if (role === "INFLUENCER") {
      const confirmed = user?.influencerProfile?.boostersConfirmed;
      if (typeof confirmed !== "boolean") {
        return res.status(400).json({
          ok: false,
          error: "Complete the Boosters step to finish onboarding.",
        });
      }
    }
    const finalStep = role === "BRAND" ? 8 : 9;
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        onboardingCompleted: true,
        onboardingStep: finalStep,
      },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/onboarding/complete ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
