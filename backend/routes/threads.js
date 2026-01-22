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

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
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
  } catch (e) {
    console.error("GET /api/threads ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/:threadId", requireAuth, async (req, res) => {
  try {
    const threadId = String(req.params.threadId || "");
    if (!threadId) return res.status(400).json({ ok: false, error: "Invalid threadId" });

    const threadRes = await pool.query(
      `
        SELECT
          t.id,
          t.request_id,
          t.created_at,
          t.updated_at,
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

    if (!threadRes.rows.length) {
      return res.status(404).json({ ok: false, error: "Thread not found" });
    }

    const thread = threadRes.rows[0];
    if (![thread.from_id, thread.to_id].includes(req.user.id)) {
      return res.status(403).json({ ok: false, error: "Not allowed" });
    }

    const other =
      thread.from_id === req.user.id
        ? {
            id: thread.to_id,
            name: thread.to_name || thread.to_username || thread.to_email || "User",
            role: thread.to_role,
          }
        : {
            id: thread.from_id,
            name: thread.from_name || thread.from_username || thread.from_email || "User",
            role: thread.from_role,
          };

    const { rows } = await pool.query(
      `
        SELECT id, sender_id, body, created_at
        FROM contact_messages
        WHERE thread_id = $1
        ORDER BY created_at ASC
      `,
      [threadId]
    );

    return res.json({
      ok: true,
      data: {
        thread: {
          id: thread.id,
          otherUser: other,
        },
        messages: rows.map((row) => ({
          id: row.id,
          senderId: row.sender_id,
          body: row.body,
          createdAt: row.created_at,
        })),
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

    const { rows } = await pool.query(
      `
        SELECT id, sender_id, body, created_at
        FROM contact_messages
        WHERE thread_id = $1
        ORDER BY created_at ASC
      `,
      [threadId]
    );

    return res.json({
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        body: row.body,
        createdAt: row.created_at,
      })),
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

    const otherUserId = thread.from_user_id === req.user.id ? thread.to_user_id : thread.from_user_id;

    const [senderRes, otherRes] = await Promise.all([
      pool.query(`SELECT role, is_premium FROM users WHERE id = $1`, [req.user.id]),
      pool.query(`SELECT role FROM users WHERE id = $1`, [otherUserId]),
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
      `
        INSERT INTO contact_messages (id, thread_id, sender_id, body, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `,
      [id, threadId, req.user.id, body]
    );

    await pool.query(
      `
        UPDATE contact_threads
        SET last_message_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `,
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
