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

function normalizePair(a, b) {
  return a < b ? [a, b] : [b, a];
}

async function ensureThread(db, userA, userB) {
  const [a, b] = normalizePair(userA, userB);
  const existing = await db.query(
    `SELECT id FROM contact_threads WHERE user_a_id = $1 AND user_b_id = $2`,
    [a, b]
  );
  if (existing.rows.length) return existing.rows[0].id;

  const id = `thread_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await db.query(
    `
      INSERT INTO contact_threads (id, user_a_id, user_b_id, created_at, updated_at, last_message_at)
      VALUES ($1, $2, $3, NOW(), NOW(), NULL)
    `,
    [id, a, b]
  );
  return id;
}

// Admin Requests Inbox (Contact Requests)
router.get("/contact-requests", async (req, res) => {
  try {
    const status = String(req.query.status || "pending").toLowerCase();
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ ok: false, error: "Invalid status" });
    }

    const { rows } = await pool.query(
      `
        SELECT
          cr.id,
          cr.message,
          cr.status,
          cr.created_at,
          fu.id AS from_id,
          fu.name AS from_name,
          fu.username AS from_username,
          fu.email AS from_email,
          fu.role AS from_role,
          tu.id AS to_id,
          tu.name AS to_name,
          tu.username AS to_username,
          tu.email AS to_email,
          tu.role AS to_role
        FROM contact_requests cr
        JOIN users fu ON fu.id = cr.from_user_id
        JOIN users tu ON tu.id = cr.to_user_id
        WHERE cr.status = $1
        ORDER BY cr.created_at DESC
      `,
      [status]
    );

    const data = rows.map((row) => ({
      id: row.id,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      fromUser: {
        id: row.from_id,
        name: row.from_name || row.from_username || row.from_email || "User",
        role: row.from_role,
      },
      toUser: {
        id: row.to_id,
        name: row.to_name || row.to_username || row.to_email || "User",
        role: row.to_role,
      },
    }));

    return res.json({ ok: true, data });
  } catch (e) {
    console.error("GET /api/admin/contact-requests ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/contact-requests/:id/approve", async (req, res) => {
  const client = await pool.connect();
  try {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

    await client.query("BEGIN");
    const requestRes = await client.query(
      `SELECT from_user_id, to_user_id, status FROM contact_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (!requestRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Request not found" });
    }

    const request = requestRes.rows[0];
    if (request.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "Request already handled" });
    }

    const threadId = await ensureThread(client, request.from_user_id, request.to_user_id);

    await client.query(
      `
        UPDATE contact_requests
        SET status = 'approved', handled_by = $2, handled_at = NOW()
        WHERE id = $1
      `,
      [id, req.user.id]
    );

    await client.query("COMMIT");
    return res.json({ ok: true, threadId });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/contact-requests/:id/approve ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  } finally {
    client.release();
  }
});

router.post("/contact-requests/:id/reject", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

    const result = await pool.query(
      `
        UPDATE contact_requests
        SET status = 'rejected', handled_by = $2, handled_at = NOW()
        WHERE id = $1 AND status = 'pending'
        RETURNING id
      `,
      [id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, error: "Request not found" });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/contact-requests/:id/reject ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

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
// ✅ Admin Requests Inbox (Contact Requests)
router.get("/requests", async (req, res) => {
  try {
    // Contact requests are orders with totalPrice = 0 (as created in profile.js)
    const rows = await prisma.order.findMany({
      where: { totalPrice: 0 },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { id: true, title: true, type: true } },
        buyer: { select: { id: true, full_name: true, email: true } },
        seller: {
          include: {
            user: { select: { id: true, full_name: true, email: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, content: true, createdAt: true, senderId: true },
        },
      },
    });

    const data = rows.map((o) => ({
      id: o.id,
      status: o.status,
      createdAt: o.createdAt,
      listing: o.listing,
      buyer: o.buyer,
      sellerUser: o.seller?.user || null,
      lastMessage: o.messages?.[0] || null,
    }));

    res.json({ ok: true, requests: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "Server error" });
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
