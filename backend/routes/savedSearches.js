const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

function normalizeType(input) {
  const v = String(input || "").toLowerCase();
  if (v === "influencer" || v === "brand") return v;
  return null;
}

function normalizeTags(input) {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : String(input).split(",").map((s) => s.trim());

  const cleaned = arr
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((t) => t.slice(0, 24));

  // unique (case-insensitive) while keeping order
  const seen = new Set();
  const out = [];
  for (const t of cleaned) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

async function requireBrand(req, res) {
  const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
  if (!me || me.role !== "BRAND") {
    res.status(403).json({ ok: false, error: "Only brands can use saved searches" });
    return false;
  }
  return true;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const ok = await requireBrand(req, res);
    if (!ok) return;

    const rows = await prisma.savedSearch.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        name: true,
        slug: true,
        tags: true,
        params: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("GET /api/saved-searches ERROR", e);
    return res.status(500).json({ ok: false, error: "Failed to load saved searches" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const ok = await requireBrand(req, res);
    if (!ok) return;

    const { type, name, slug, params, tags } = req.body || {};
    const normType = normalizeType(type);
    if (!normType) return res.status(400).json({ ok: false, error: "Invalid type" });
    if (!params || typeof params !== "object") return res.status(400).json({ ok: false, error: "Invalid params" });

    const safeName = name ? String(name).trim().slice(0, 120) : null;
    const safeSlug = slug ? String(slug).trim().slice(0, 180) : null;
    const safeTags = normalizeTags(tags);

    const row = await prisma.savedSearch.create({
      data: {
        userId: req.user.id,
        type: normType,
        name: safeName,
        slug: safeSlug,
        tags: safeTags,
        params,
      },
      select: {
        id: true,
        type: true,
        name: true,
        slug: true,
        tags: true,
        params: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ ok: true, data: row });
  } catch (e) {
    console.error("POST /api/saved-searches ERROR", e);
    return res.status(500).json({ ok: false, error: "Failed to save search" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const ok = await requireBrand(req, res);
    if (!ok) return;

    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });

    const { name, tags } = req.body || {};
    const data = {};

    if (typeof name !== "undefined") {
      const n = String(name || "").trim();
      data.name = n ? n.slice(0, 120) : null;
    }

    if (typeof tags !== "undefined") {
      data.tags = normalizeTags(tags);
    }

    if (!Object.keys(data).length) return res.status(400).json({ ok: false, error: "Nothing to update" });

    const updated = await prisma.savedSearch.updateMany({
      where: { id, userId: req.user.id },
      data,
    });

    if (!updated.count) return res.status(404).json({ ok: false, error: "Not found" });

    const row = await prisma.savedSearch.findFirst({
      where: { id, userId: req.user.id },
      select: {
        id: true,
        type: true,
        name: true,
        slug: true,
        tags: true,
        params: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ ok: true, data: row });
  } catch (e) {
    console.error("PATCH /api/saved-searches/:id ERROR", e);
    return res.status(500).json({ ok: false, error: "Failed to update saved search" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const ok = await requireBrand(req, res);
    if (!ok) return;

    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });

    await prisma.savedSearch.deleteMany({ where: { id, userId: req.user.id } });
    return res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/saved-searches ERROR", e);
    return res.status(500).json({ ok: false, error: "Failed to delete saved search" });
  }
});

module.exports = router;
