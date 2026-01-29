// backend/routes/brandCampaigns.js
const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * Minimal Campaign API (Express):
 * POST   /api/brand/campaigns
 * GET    /api/brand/campaigns
 * GET    /api/brand/campaigns/:id
 * PATCH  /api/brand/campaigns/:id
 *
 * IMPORTANT:
 * - This file assumes your Prisma schema already has:
 *   model Campaign { ... brandId ... requirements CampaignRequirement? ... }
 *   model CampaignRequirement { ... campaignId ... }
 */

// helper: accept both snake_case and camelCase keys
function pickAny(obj, keys, fallback = undefined) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined) return obj[k];
  }
  return fallback;
}

function arr(v) {
  return Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : [];
}

router.use(requireAuth);

/** Create campaign */
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;

    // DEBUG: log incoming request for easier debugging of 500 errors
    try {
      console.log("POST /api/brand/campaigns body:", JSON.stringify(req.body));
    } catch (__) {
      console.log("POST /api/brand/campaigns body: <unserializable>");
    }

    // optional: ensure BRAND (safe, no DB update)
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (me?.role && String(me.role).toUpperCase() !== "BRAND") {
      return res.status(403).json({ ok: false, error: "Only BRAND users can create campaigns" });
    }

    const name = pickAny(req.body, ["name", "title"]);
    if (!name) return res.status(400).json({ ok: false, error: "name is required" });

    const objective = pickAny(req.body, ["objective"], "awareness");
    const platform = pickAny(req.body, ["platform"], "instagram");
    const status = pickAny(req.body, ["status"], "draft");
    const contentTypes = arr(pickAny(req.body, ["contentTypes", "content_types"], [])).map(String);

    const description = pickAny(req.body, ["description"], null);
    const budgetType = String(pickAny(req.body, ["budgetType", "budget_type"], "fixed"));

    const minBudget = pickAny(req.body, ["minBudget", "min_budget"], null);
    const maxBudget = pickAny(req.body, ["maxBudget", "max_budget"], null);

    // validate budget ranges
    const _minBudget = minBudget === null ? null : Number(minBudget);
    const _maxBudget = maxBudget === null ? null : Number(maxBudget);
    if (_minBudget !== null && _maxBudget !== null && _minBudget > _maxBudget) {
      return res.status(400).json({ ok: false, error: "minBudget cannot be greater than maxBudget" });
    }

    const startDate = pickAny(req.body, ["startDate", "start_date"], null);
    const endDate = pickAny(req.body, ["endDate", "end_date"], null);

    const requirements = pickAny(req.body, ["requirements"], {}) || {};
    const reqCategories = arr(pickAny(requirements, ["categories"], [])).map(String);
    const reqLanguages = arr(pickAny(requirements, ["languages"], [])).map(String);
    const reqLocations = arr(pickAny(requirements, ["locations"], [])).map(String);
    const minFollowers = pickAny(requirements, ["minFollowers", "min_followers"], null);
    const maxFollowers = pickAny(requirements, ["maxFollowers", "max_followers"], null);

    // Create Campaign + Requirements (if your schema has requirements relation)
   const created = await prisma.campaign.create({
  data: {
    brandId: userId,
    name: String(name),
    objective: String(objective || "awareness"),
    platform: String(platform || "instagram"),
    status: String(status || "draft"),
    description,
    budgetType: String(budgetType || "fixed"),
    contentTypes: contentTypes.length ? contentTypes : [], // ✅ REQUIRED FIX
    minBudget: minBudget === null ? null : Number(minBudget),
    maxBudget: maxBudget === null ? null : Number(maxBudget),
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    stats: { create: {} }, // ✅ CampaignStats init (VERY IMPORTANT)
  },
  include: { requirements: true, stats: true },
});



    // try create requirements only if model exists. wrap in its own try/catch
    if (prisma.campaignRequirement) {
      try {
        await prisma.campaignRequirement.upsert({
          where: { campaignId: created.id },
          create: {
            campaignId: created.id,
            categories: reqCategories,
            languages: reqLanguages,
            locations: reqLocations,
            minFollowers: minFollowers === null ? null : Number(minFollowers),
            maxFollowers: maxFollowers === null ? null : Number(maxFollowers),
          },
          update: {
            categories: reqCategories,
            languages: reqLanguages,
            locations: reqLocations,
            minFollowers: minFollowers === null ? null : Number(minFollowers),
            maxFollowers: maxFollowers === null ? null : Number(maxFollowers),
          },
        });
      } catch (upsertErr) {
        console.error("Campaign requirements upsert failed:", upsertErr);
      }
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: created.id },
      include: { requirements: true },
    });

    console.log("Created campaign id:", created.id);
    return res.json({ ok: true, campaign });
  } catch (e) {
    console.error("POST /api/brand/campaigns ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/** List campaigns of this brand */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const list = await prisma.campaign.findMany({
      where: { brandId: userId },
      orderBy: { createdAt: "desc" },
      include: { requirements: true },
    });
    return res.json({ ok: true, data: list });
  } catch (e) {
    console.error("GET /api/brand/campaigns ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/** Get one campaign */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const id = String(req.params.id || "");
    const c = await prisma.campaign.findFirst({
      where: { id, brandId: userId },
      include: { requirements: true },
    });
    if (!c) return res.status(404).json({ ok: false, error: "Campaign not found" });
    return res.json({ ok: true, campaign: c });
  } catch (e) {
    console.error("GET /api/brand/campaigns/:id ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/** Update campaign */
router.patch("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const id = String(req.params.id || "");

    const existing = await prisma.campaign.findFirst({ where: { id, brandId: userId } });
    if (!existing) return res.status(404).json({ ok: false, error: "Campaign not found" });

    const patch = {};
    const updatable = [
      "name",
      "objective",
      "platform",
      "status",
      "description",
      "budgetType",
      "minBudget",
      "maxBudget",
      "startDate",
      "endDate",
      "contentTypes",
    ];

    for (const k of updatable) {
      if (req.body?.[k] !== undefined) {
        patch[k] = k === "contentTypes" ? arr(req.body[k]).map(String) : req.body[k];
      }
    }

    // Validate budget on update: ensure final min/max are consistent
    const minBudgetPatch = patch.hasOwnProperty("minBudget") ? (patch.minBudget == null ? null : Number(patch.minBudget)) : undefined;
    const maxBudgetPatch = patch.hasOwnProperty("maxBudget") ? (patch.maxBudget == null ? null : Number(patch.maxBudget)) : undefined;
    const finalMin = minBudgetPatch !== undefined ? minBudgetPatch : existing.minBudget ?? null;
    const finalMax = maxBudgetPatch !== undefined ? maxBudgetPatch : existing.maxBudget ?? null;
    if (finalMin !== null && finalMax !== null && finalMin > finalMax) {
      return res.status(400).json({ ok: false, error: "minBudget cannot be greater than maxBudget" });
    }

    // requirements update (optional)
    const requirements = req.body?.requirements;
    let reqUpdate = null;
    if (requirements && typeof requirements === "object") {
      reqUpdate = {
        categories: requirements.categories ? arr(requirements.categories).map(String) : undefined,
        languages: requirements.languages ? arr(requirements.languages).map(String) : undefined,
        locations: requirements.locations ? arr(requirements.locations).map(String) : undefined,
        minFollowers: requirements.minFollowers !== undefined ? (requirements.minFollowers === null ? null : Number(requirements.minFollowers)) : undefined,
        maxFollowers: requirements.maxFollowers !== undefined ? (requirements.maxFollowers === null ? null : Number(requirements.maxFollowers)) : undefined,
      };
      // remove undefined keys
      Object.keys(reqUpdate).forEach((k) => reqUpdate[k] === undefined && delete reqUpdate[k]);
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...patch,
        startDate: patch.startDate ? new Date(patch.startDate) : patch.startDate === null ? null : undefined,
        endDate: patch.endDate ? new Date(patch.endDate) : patch.endDate === null ? null : undefined,
        ...(reqUpdate
          ? {
              requirements: {
                upsert: {
                  create: reqUpdate,
                  update: reqUpdate,
                },
              },
            }
          : {}),
      },
      include: { requirements: true },
    });

    return res.json({ ok: true, campaign: updated });
 } catch (e) {
  console.error("POST /api/brand/campaigns ERROR:", e);
  return res.status(500).json({
    ok: false,
    error: e?.message || "Server error",
  });
}

});

module.exports = router;
