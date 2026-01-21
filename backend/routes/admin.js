const express = require("express");
const pool = require("../db");
const { prisma } = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireAdmin);

function resolveTable(role) {
  if (role === "influencer") return "influencer_values";
  if (role === "brand") return "brand_values";
  return null;
}

function parseMeta(input) {
  if (!input) return {};
  if (typeof input === "object") return input;
  try {
    return JSON.parse(String(input));
  } catch {
    return {};
  }
}

async function logAudit(req, action, details) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action,
        details: typeof details === "string" ? details : JSON.stringify(details || {}),
      },
    });
  } catch (err) {
    console.warn("Audit log failed:", err?.message || err);
  }
}

// Dynamic values admin
router.get("/values/:role", async (req, res) => {
  try {
    const role = String(req.params.role || "").toLowerCase();
    const table = resolveTable(role);
    if (!table) return res.status(400).json({ ok: false, error: "Invalid role" });

    const key = String(req.query.key || "").trim();
    const params = [];
    const where = [];
    if (key) {
      params.push(key);
      where.push(`key = $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `
        SELECT id, key, value, label, meta, sort_order, is_active
        FROM ${table}
        ${whereClause}
        ORDER BY key ASC, sort_order ASC, label ASC NULLS LAST, value ASC
      `,
      params
    );

    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("GET /api/admin/values ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/values/:role", async (req, res) => {
  try {
    const role = String(req.params.role || "").toLowerCase();
    const table = resolveTable(role);
    if (!table) return res.status(400).json({ ok: false, error: "Invalid role" });

    const { key, value, label, meta, sort_order, is_active } = req.body || {};
    if (!key || !value) {
      return res.status(400).json({ ok: false, error: "key and value are required" });
    }

    const sortOrder = Number.isInteger(sort_order) ? sort_order : 0;
    const active = is_active === undefined ? true : Boolean(is_active);

    const { rows } = await pool.query(
      `
        INSERT INTO ${table} (key, value, label, meta, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, key, value, label, meta, sort_order, is_active
      `,
      [String(key), String(value), label ? String(label) : null, parseMeta(meta), sortOrder, active]
    );

    await logAudit(req, "admin.values.create", { role, value: rows[0] });
    return res.json({ ok: true, data: rows[0] });
  } catch (e) {
    console.error("POST /api/admin/values ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.patch("/values/:role/:id", async (req, res) => {
  try {
    const role = String(req.params.role || "").toLowerCase();
    const table = resolveTable(role);
    if (!table) return res.status(400).json({ ok: false, error: "Invalid role" });

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: "Invalid id" });
    }

    const updates = [];
    const params = [];
    const { key, value, label, meta, sort_order, is_active } = req.body || {};

    if (key !== undefined) {
      params.push(String(key));
      updates.push(`key = $${params.length}`);
    }
    if (value !== undefined) {
      params.push(String(value));
      updates.push(`value = $${params.length}`);
    }
    if (label !== undefined) {
      params.push(label === null ? null : String(label));
      updates.push(`label = $${params.length}`);
    }
    if (meta !== undefined) {
      params.push(parseMeta(meta));
      updates.push(`meta = $${params.length}`);
    }
    if (sort_order !== undefined) {
      params.push(Number.isInteger(sort_order) ? sort_order : 0);
      updates.push(`sort_order = $${params.length}`);
    }
    if (is_active !== undefined) {
      params.push(Boolean(is_active));
      updates.push(`is_active = $${params.length}`);
    }

    if (!updates.length) {
      return res.status(400).json({ ok: false, error: "No updates provided" });
    }

    params.push(id);
    const { rows } = await pool.query(
      `
        UPDATE ${table}
        SET ${updates.join(", ")}
        WHERE id = $${params.length}
        RETURNING id, key, value, label, meta, sort_order, is_active
      `,
      params
    );

    await logAudit(req, "admin.values.update", { role, value: rows[0] });
    return res.json({ ok: true, data: rows[0] });
  } catch (e) {
    console.error("PATCH /api/admin/values ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.delete("/values/:role/:id", async (req, res) => {
  try {
    const role = String(req.params.role || "").toLowerCase();
    const table = resolveTable(role);
    if (!table) return res.status(400).json({ ok: false, error: "Invalid role" });

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: "Invalid id" });
    }

    const { rows } = await pool.query(
      `
        UPDATE ${table}
        SET is_active = false
        WHERE id = $1
        RETURNING id, key, value, label, meta, sort_order, is_active
      `,
      [id]
    );
    await logAudit(req, "admin.values.disable", { role, value: rows[0] || { id } });
    return res.json({ ok: true, data: rows[0] || null });
  } catch (e) {
    console.error("DELETE /api/admin/values ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// Admin user management
router.get("/users", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim().toLowerCase();
    const where = query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined;
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        countryCode: true,
        role: true,
        isAdmin: true,
        isLocked: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });
    return res.json({ ok: true, data: users });
  } catch (e) {
    console.error("GET /api/admin/users ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

    const { email, username, role, isAdmin, isLocked, phone, countryCode } = req.body || {};
    const data = {};

    if (email !== undefined) {
      const lower = String(email).toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: lower }, select: { id: true } });
      if (existing && existing.id !== id) {
        return res.status(409).json({ ok: false, error: "Email already exists" });
      }
      data.email = lower;
    }

    if (username !== undefined) {
      const trimmed = username ? String(username).trim().toLowerCase() : null;
      if (trimmed) {
        if (trimmed.length < 6 || trimmed.length > 18) {
          return res.status(400).json({ ok: false, error: "Username must be between 6 and 18 characters" });
        }
        if (!/^[a-z0-9._]+$/.test(trimmed)) {
          return res.status(400).json({ ok: false, error: "Username may only contain lowercase letters, numbers, dots or underscores" });
        }
        const existing = await prisma.user.findUnique({ where: { username: trimmed }, select: { id: true } });
        if (existing && existing.id !== id) {
          return res.status(409).json({ ok: false, error: "Username already taken" });
        }
      }
      data.username = trimmed;
    }

    if (role !== undefined) {
      const normalized = String(role || "").toUpperCase();
      if (!["INFLUENCER", "BRAND"].includes(normalized)) {
        return res.status(400).json({ ok: false, error: "Invalid role" });
      }
      data.role = normalized;
    }

    if (isAdmin !== undefined) {
      if (!isAdmin) {
        const adminCount = await prisma.user.count({ where: { isAdmin: true } });
        if (adminCount <= 1) {
          return res.status(400).json({ ok: false, error: "Cannot remove the last admin" });
        }
      }
      data.isAdmin = Boolean(isAdmin);
    }
    if (isLocked !== undefined) data.isLocked = Boolean(isLocked);
    if (phone !== undefined) data.phone = phone ? String(phone) : null;
    if (countryCode !== undefined) data.countryCode = countryCode ? String(countryCode) : null;

    if (!Object.keys(data).length) {
      return res.status(400).json({ ok: false, error: "No updates provided" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        countryCode: true,
        role: true,
        isAdmin: true,
        isLocked: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    await logAudit(req, "admin.users.update", { userId: id, updates: data });
    return res.json({ ok: true, data: updated });
  } catch (e) {
    console.error("PATCH /api/admin/users ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.patch("/users/:id/lock", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

    const { isLocked } = req.body || {};
    const updated = await prisma.user.update({
      where: { id },
      data: { isLocked: Boolean(isLocked) },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        countryCode: true,
        role: true,
        isAdmin: true,
        isLocked: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    await logAudit(req, "admin.users.lock", { userId: id, isLocked: Boolean(isLocked) });
    return res.json({ ok: true, data: updated });
  } catch (e) {
    console.error("PATCH /api/admin/users/lock ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.patch("/users/:id/admin", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

    const { isAdmin } = req.body || {};
    if (!isAdmin) {
      const adminCount = await prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        return res.status(400).json({ ok: false, error: "Cannot remove the last admin" });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isAdmin: Boolean(isAdmin) },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        countryCode: true,
        role: true,
        isAdmin: true,
        isLocked: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    await logAudit(req, "admin.users.admin", { userId: id, isAdmin: Boolean(isAdmin) });
    return res.json({ ok: true, data: updated });
  } catch (e) {
    console.error("PATCH /api/admin/users/admin ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
    if (req.user?.id === id) {
      return res.status(400).json({ ok: false, error: "Cannot delete your own account" });
    }

    await prisma.user.delete({ where: { id } });
    await logAudit(req, "admin.users.delete", { userId: id });
    return res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/users ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
