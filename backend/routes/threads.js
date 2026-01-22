const express = require("express");
const { randomUUID } = require("crypto");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function createId() {
  if (typeof randomUUID === "function") return randomUUID();
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildDisplayName(row) {
  return row.other_name || row.other_username || row.other_email || "User";
}

// ✅ Cache whether request_id column exists
let _hasRequestIdColumn = null;

async function hasRequestIdColumn() {
  if (_hasRequestIdColumn !== null) return _hasRequestIdColumn;
  try {
    const r = await pool.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='contact_threads'
        AND column_name='request_id'
      LIMIT 1
      `
    );
    _hasRequestIdColumn = r.rows.length > 0;
  } catch (e) {
    _hasRequestIdColumn = false;
  }
  return _hasRequestIdColumn;
}

// ✅ SafeQuery for users.is_premium missing case
async function safeQuery(primarySql, params, fallbackSql) {
  try {
    return await pool.query(primarySql, params);
  } catch (e) {
    if (!fallbackSql) throw e;
    return await pool.query(fallbackSql, params);
  }
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const withRequest = await hasRequestIdColumn();

    // ✅ NEW schema (request_id exists)
    if (withRequest) {
      const { rows } = await pool.query(
        `
          SELECT
            t.id,
            t.request_id,
            t.last_message_at,
            t.updated_at,
            t.created_at,
            cr.from_user_id,
            cr.to_user_id,
            u.id AS other_id,
            u.name AS other_name,
            u.username AS other_username,
            u.email AS other_email,
            u.role AS other_role,
            lm.body AS last_message,
            lm.created_at AS last_message_time
          FROM contact_threads t
          JOIN contact_requests cr ON cr.id = t.request_id
          JOIN users u
            ON u.id = CASE
              WHEN cr.from_user_id = $1 THEN cr.to_user_id
              ELSE cr.from_user_id
            END
          LEFT JOIN LATERAL (
            SELECT body, created_at
            FROM contact_messages
            WHERE thread_id = t.id
            ORDER BY created_at DESC
            LIMIT 1
          ) lm ON true
          WHERE cr.from_user_id = $1 OR cr.to_user_id = $1
          ORDER BY COALESCE(lm.created_at, t.last_message_at, t.updated_at, t.created_at) DESC
        `,
        [userId]
      );

      const threads = rows.map((row) => ({
        id: row.id,
        otherUser: {
          id: row.other_id,
          name: buildDisplayName(row),
          role: row.other_role,
        },
        lastMessage: row.last_message || null,
        lastMessageAt: row.last_message_time || row.last_message_at || null,
      }));

      return res.json({ ok: true, data: threads });
    }

    // ✅ OLD schema fallback (no request_id)
    const { rows } = await pool.query(
      `
        SELECT
          t.id,
          t.last_message_at,
          t.updated_at,
          t.created_at,
          u.id AS other_id,
          u.name AS other_name,
          u.username AS other_username,
          u.email AS other_email,
          u.role AS other_role,
          lm.body AS last_message,
          lm.created_at AS last_message_time
        FROM contact_threads t
        JOIN users u
          ON u.id = CASE
            WHEN t.user_a_id = $1 THEN t.user_b_id
            ELSE t.user_a_id
          END
        LEFT JOIN LATERAL (
          SELECT body, created_at
          FROM contact_messages
          WHERE thread_id = t.id
          ORDER BY created_at DESC
          LIMIT 1
        ) lm ON true
        WHERE t.user_a_id = $1 OR t.user_b_id = $1
        ORDER BY COALESCE(lm.created_at, t.last_message_at, t.updated_at, t.created_at) DESC
      `,
      [userId]
    );

    const threads = rows.map((row) => ({
      id: row.id,
      otherUser: {
        id: row.other_id,
        name: buildDisplayName(row),
        role: row.other_role,
      },
      lastMessage: row.last_message || null,
      lastMessageAt: row.last_message_time || row.last_message_at || null,
    }));

    return res.json({ ok: true, data: threads });
  } catch (e) {
    console.error("GET /api/threads ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/:threadId", requireAuth, async (req, res) => {
  try {
    const threadId = String(req.params.threadId || "");
    if (!threadId) return res.status(400).json({ ok: false, error: "Invalid threadId" });

    const withRequest = await hasRequestIdColumn();

    let thread = null;

    if (withRequest) {
      const threadRes = await pool.query(
        `
          SELECT
            t.id,
            t.request_id,
            cr.from_user_id,
            cr.to_user_id,
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
          FROM contact_threads t
          JOIN contact_requests cr ON cr.id = t.request_id
          JOIN users fu ON fu.id = cr.from_user_id
          JOIN users tu ON tu.id = cr.to_user_id
          WHERE t.id = $1
        `,
        [threadId]
      );

      if (!threadRes.rows.length) return res.status(404).json({ ok: false, error: "Thread not found" });
      thread = threadRes.rows[0];

      if (![thread.from_id, thread.to_id].includes(req.user.id)) {
        return res.status(403).json({ ok: false, error: "Not allowed" });
      }

      const other =
        thread.from_id === req.user.id
          ? { id: thread.to_id, name: thread.to_name || thread.to_username || thread.to_email || "User", role: thread.to_role }
          : { id: thread.from_id, name: thread.from_name || thread.from_username || thread.from_email || "User", role: thread.from_role };

      const { rows } = await pool.query(
        `SELECT id, sender_id, body, created_at FROM contact_messages WHERE thread_id=$1 ORDER BY created_at ASC`,
        [threadId]
      );

      return res.json({
        ok: true,
        data: {
          thread: { id: thread.id, otherUser: other },
          messages: rows.map((r) => ({ id: r.id, senderId: r.sender_id, body: r.body, createdAt: r.created_at })),
        },
      });
    }

    // ✅ OLD schema thread detail
    const threadRes = await pool.query(
      `
        SELECT t.id, t.user_a_id, t.user_b_id,
               ua.id AS a_id, ua.name AS a_name, ua.username AS a_username, ua.email AS a_email, ua.role AS a_role,
               ub.id AS b_id, ub.name AS b_name, ub.username AS b_username, ub.email AS b_email, ub.role AS b_role
        FROM contact_threads t
        JOIN users ua ON ua.id = t.user_a_id
        JOIN users ub ON ub.id = t.user_b_id
        WHERE t.id = $1
      `,
      [threadId]
    );

    if (!threadRes.rows.length) return res.status(404).json({ ok: false, error: "Thread not found" });
    thread = threadRes.rows[0];

    if (![thread.a_id, thread.b_id].includes(req.user.id)) {
      return res.status(403).json({ ok: false, error: "Not allowed" });
    }

    const other =
      thread.a_id === req.user.id
        ? { id: thread.b_id, name: thread.b_name || thread.b_username || thread.b_email || "User", role: thread.b_role }
        : { id: thread.a_id, name: thread.a_name || thread.a_username || thread.a_email || "User", role: thread.a_role };

    const { rows } = await pool.query(
      `SELECT id, sender_id, body, created_at FROM contact_messages WHERE thread_id=$1 ORDER BY created_at ASC`,
      [threadId]
    );

    return res.json({
      ok: true,
      data: {
        thread: { id: thread.id, otherUser: other },
        messages: rows.map((r) => ({ id: r.id, senderId: r.sender_id, body: r.body, createdAt: r.created_at })),
      },
    });
  } catch (e) {
    console.error("GET /api/threads/:id ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/:threadId/messages", requireAuth, async (req, res) => {
  try {
    const threadId = String(req.params.threadId || "");
    if (!threadId) return res.status(400).json({ ok: false, error: "Invalid threadId" });

    const withRequest = await hasRequestIdColumn();

    let allowed = false;
    if (withRequest) {
      const t = await pool.query(
        `
          SELECT cr.from_user_id, cr.to_user_id
          FROM contact_threads t
          JOIN contact_requests cr ON cr.id = t.request_id
          WHERE t.id = $1
        `,
        [threadId]
      );
      if (!t.rows.length) return res.status(404).json({ ok: false, error: "Thread not found" });
      allowed = [t.rows[0].from_user_id, t.rows[0].to_user_id].includes(req.user.id);
    } else {
      const t = await pool.query(`SELECT user_a_id, user_b_id FROM contact_threads WHERE id=$1`, [threadId]);
      if (!t.rows.length) return res.status(404).json({ ok: false, error: "Thread not found" });
      allowed = [t.rows[0].user_a_id, t.rows[0].user_b_id].includes(req.user.id);
    }

    if (!allowed) return res.status(403).json({ ok: false, error: "Not allowed" });

    const { rows } = await pool.query(
      `SELECT id, sender_id, body, created_at FROM contact_messages WHERE thread_id=$1 ORDER BY created_at ASC`,
      [threadId]
    );

    return res.json({
      ok: true,
      data: rows.map((r) => ({ id: r.id, senderId: r.sender_id, body: r.body, createdAt: r.created_at })),
    });
  } catch (e) {
    console.error("GET /api/threads/:id/messages ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/:threadId/messages", requireAuth, async (req, res) => {
  try {
    const threadId = String(req.params.threadId || "");
    const body = String(req.body?.body || "").trim();
    if (!threadId) return res.status(400).json({ ok: false, error: "Invalid threadId" });
    if (!body) return res.status(400).json({ ok: false, error: "Message body is required" });

    const withRequest = await hasRequestIdColumn();

    let otherUserId = null;

    if (withRequest) {
      const threadRes = await pool.query(
        `
          SELECT cr.from_user_id, cr.to_user_id
          FROM contact_threads t
          JOIN contact_requests cr ON cr.id = t.request_id
          WHERE t.id = $1
        `,
        [threadId]
      );
      if (!threadRes.rows.length) return res.status(404).json({ ok: false, error: "Thread not found" });

      const thread = threadRes.rows[0];
      if (![thread.from_user_id, thread.to_user_id].includes(req.user.id)) {
        return res.status(403).json({ ok: false, error: "Not allowed" });
      }
      otherUserId = thread.from_user_id === req.user.id ? thread.to_user_id : thread.from_user_id;
    } else {
      const threadRes = await pool.query(`SELECT user_a_id, user_b_id FROM contact_threads WHERE id=$1`, [threadId]);
      if (!threadRes.rows.length) return res.status(404).json({ ok: false, error: "Thread not found" });

      const thread = threadRes.rows[0];
      if (![thread.user_a_id, thread.user_b_id].includes(req.user.id)) {
        return res.status(403).json({ ok: false, error: "Not allowed" });
      }
      otherUserId = thread.user_a_id === req.user.id ? thread.user_b_id : thread.user_a_id;
    }

    // ✅ Premium rule (safe even if users.is_premium missing)
    const [senderRes, otherRes] = await Promise.all([
      safeQuery(
        `SELECT role, is_premium FROM users WHERE id=$1`,
        [req.user.id],
        `SELECT role, false as is_premium FROM users WHERE id=$1`
      ),
      pool.query(`SELECT role FROM users WHERE id=$1`, [otherUserId]),
    ]);

    const sender = senderRes.rows[0];
    const other = otherRes.rows[0];
    if (!sender) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const senderRole = String(sender.role || "").toUpperCase();
    const otherRole = String(other?.role || "").toUpperCase();

    if (senderRole === "INFLUENCER" && otherRole === "BRAND" && !sender.is_premium) {
      return res.status(403).json({ ok: false, error: "Premium required to message" });
    }

    const id = createId();
    await pool.query(
      `INSERT INTO contact_messages (id, thread_id, sender_id, body, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [id, threadId, req.user.id, body]
    );

    await pool.query(
      `UPDATE contact_threads SET last_message_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [threadId]
    );

    return res.json({
      ok: true,
      data: { id, senderId: req.user.id, body, createdAt: new Date().toISOString() },
    });
  } catch (e) {
    console.error("POST /api/threads/:id/messages ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
