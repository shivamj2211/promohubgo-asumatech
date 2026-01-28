const express = require("express");
const jwt = require("jsonwebtoken");
const { prisma } = require("../lib/prisma");
const { COOKIE_NAME } = require("../utils/jwt");

const router = express.Router();

const INFLUENCER_FLOW = [
  { step: 1, route: "/profile", title: "Profile" },
  { step: 2, route: "/location", title: "Location" },
  { step: 3, route: "/social-media", title: "Social media" },
  { step: 4, route: "/description", title: "Description" },
  { step: 5, route: "/summary", title: "Summary" },
  { step: 6, route: "/cover-images", title: "Cover images" },
  { step: 7, route: "/portfolio", title: "Portfolio" },
  { step: 8, route: "/creator/packages", title: "Packages" },
  { step: 9, route: "/boosters", title: "Boosters" },
];

const BRAND_FLOW = [
  { step: 1, route: "/profile", title: "Profile" },
  { step: 2, route: "/location", title: "Location" },
  { step: 3, route: "/brand/heretodo", title: "Here to do" },
  { step: 4, route: "/brand/approximatebudget", title: "Budget" },
  { step: 5, route: "/brand/businesstype", title: "Business type" },
  { step: 6, route: "/brand/selectinfluencer", title: "Select influencer" },
  { step: 7, route: "/brand/targetplatforms", title: "Target platforms" },
  { step: 8, route: "/summary", title: "Summary" },
];

function getRouteForStep(role, step) {
  const flow = role === "BRAND" ? BRAND_FLOW : INFLUENCER_FLOW;
  const found = flow.find((s) => s.step === step);
  return found?.route || flow[0]?.route || "/";
}

async function getUserFromRequest(req) {
  try {
    const token =
      req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isLocked: true },
    });
    if (!user || user.isLocked) return null;
    return user;
  } catch {
    return null;
  }
}

function addCheck(state, ok, key, label, step) {
  state.total += 1;
  if (ok) {
    state.completed += 1;
    return;
  }
  state.missing.push({ key, label, step });
}

async function buildOnboardingStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) return null;

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
    addCheck(state, hasPortfolioLinks, "portfolio", "Add portfolio images", 7);

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

  return {
    role,
    completion: { percent, completed: state.completed, total: state.total },
    missing: state.missing,
    nextStep,
  };
}

/**
 * GET /api/chatbot/ping
 * just to verify backend is working
 */
router.get("/ping", (_req, res) => {
  res.json({ message: "chatbot route working" });
});

router.get("/config", (_req, res) => {
  res.json({
    actions: [
      {
        id: "article",
        label: "Read articles",
        type: "REDIRECT",
        url: "/articles",
      },
      {
        id: "demo",
        label: "Request a demo",
        type: "REDIRECT",
        url: "/demo",
      },
      {
        id: "onboarding",
        label: "Complete onboarding",
        type: "REQUIRE_LOGIN",
        redirectAfterLogin: "/profile",
      },
      {
        id: "package",
        label: "Create / modify package",
        type: "REQUIRE_LOGIN",
        redirectAfterLogin: "/creator/packages",
      },
    ],
  });
});

router.post("/message", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({
      reply: "Please type something so I can help.",
    });
  }

  const text = message.toLowerCase();
  const user = await getUserFromRequest(req);
  const status = user ? await buildOnboardingStatus(user.id) : null;

  const defaultSuggestions = () => {
    if (!status?.missing?.length || !status?.role) return [];
    return status.missing.slice(0, 3).map((item) => ({
      label: item.label,
      type: "REQUIRE_LOGIN",
      redirectAfterLogin: getRouteForStep(status.role, item.step),
    }));
  };

  const replyWithStatus = (base, forceStep) => {
    if (!status) {
      return res.json({
        reply: "Please log in to view your onboarding completion status.",
        suggestions: [
          {
            label: "Complete onboarding",
            type: "REQUIRE_LOGIN",
            redirectAfterLogin: "/profile",
          },
        ],
      });
    }

    const nextStep = forceStep || status.nextStep;
    const nextRoute = nextStep ? getRouteForStep(status.role, nextStep) : "/listings";
    const percent = status.completion?.percent ?? 0;
    const missingLabel = status.missing?.[0]?.label;

    const reply =
      `${base} Your profile is ${percent}% complete.` +
      (missingLabel ? ` Next: ${missingLabel}.` : " You're all set!");

    return res.json({
      reply,
      suggestions: [
        {
          label: nextStep ? "Continue onboarding" : "Go to listings",
          type: "REQUIRE_LOGIN",
          redirectAfterLogin: nextRoute,
        },
      ],
    });
  };

  // --- Simple intent detection (rule-based AI) ---
  if (text.includes("onboarding") || text.includes("complete")) {
    return replyWithStatus(
      "To start using PromoHub fully, please complete your onboarding.",
      status?.nextStep || null
    );
  }

  if (text.includes("package")) {
    if (!status) {
      return res.json({
        reply: "Please log in to manage your packages.",
        suggestions: [
          { label: "Create package", type: "REQUIRE_LOGIN", redirectAfterLogin: "/creator/packages" },
        ],
      });
    }
    return res.json({
      reply: `Your profile is ${status.completion?.percent ?? 0}% complete. Manage your packages below.`,
      suggestions: [
        { label: "Create package", type: "REQUIRE_LOGIN", redirectAfterLogin: "/creator/packages" },
      ],
    });
  }

  if (text.includes("social") || text.includes("socials") || text.includes("links")) {
    return replyWithStatus("Add your social channels to build trust with brands.", 3);
  }

  if (text.includes("portfolio")) {
    return replyWithStatus("Add portfolio images to showcase your work.", 7);
  }

  if (text.includes("booster") || text.includes("boost") || text.includes("deal")) {
    return replyWithStatus("Complete the Boosters section to improve deal success.", 9);
  }

  if (text.includes("cover") || text.includes("image")) {
    return replyWithStatus("Add cover images to highlight your profile.", 6);
  }

  if (text.includes("brand")) {
    return res.json({
      reply:
        "Brands can explore creators, compare packages, and place orders directly through PromoHub.",
      suggestions: defaultSuggestions(),
    });
  }

  if (text.includes("creator")) {
    return res.json({
      reply:
        "Creators on PromoHub can list services, manage packages, receive orders, and track earnings.",
      suggestions: defaultSuggestions(),
    });
  }

  if (text.includes("help") || text.includes("start")) {
    return replyWithStatus(
      "I can help you with onboarding, packages, socials, and portfolio.",
      status?.nextStep || null
    );
  }

  // --- fallback ---
  return res.json({
    reply:
      "I’m here to help. Ask me about onboarding, packages, socials, or portfolio.",
    suggestions: defaultSuggestions(),
  });
});

module.exports = router;
