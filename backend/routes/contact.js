const express = require("express");
const { randomUUID } = require("crypto");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function createId() {
  if (typeof randomUUID === "function") return randomUUID();
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

router.post("/request", requireAuth, async (req, res) => {
  try {
    const toUserId = String(req.body?.toUserId || "").trim();
    const message = String(req.body?.message || "").trim();
    if (!toUserId) return res.status(400).json({ ok: false, error: "toUserId is required" });
    if (!message) return res.status(400).json({ ok: false, error: "Message is required" });
    if (toUserId === req.user.id) return res.status(400).json({ ok: false, error: "Cannot contact yourself" });

    const userRes = await pool.query(`SELECT id FROM users WHERE id = $1`, [toUserId]);
    if (!userRes.rows.length) return res.status(404).json({ ok: false, error: "User not found" });

    const id = createId();
    await pool.query(
      `
        INSERT INTO contact_requests (id, from_user_id, to_user_id, message, status, created_at)
        VALUES ($1, $2, $3, $4, 'pending', NOW())
      `,
      [id, req.user.id, toUserId, message]
    );

    return res.json({ ok: true, requestId: id });
  } catch (e) {
    console.error("POST /api/contact/request ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/threads", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `
        SELECT
          t.id,
          t.user_a_id,
          t.user_b_id,
          t.updated_at,
          t.last_message_at,
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
        name: row.other_name || row.other_username || row.other_email || "User",
        role: row.other_role,
      },
      lastMessage: row.last_message || null,
      lastMessageAt: row.last_message_time || row.last_message_at || null,
    }));

    return res.json({ ok: true, data: threads });
  } catch (e) {
    console.error("GET /api/contact/threads ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/threads/:threadId/messages", requireAuth, async (req, res) => {
  try {
    const threadId = String(req.params.threadId || "");
    if (!threadId) return res.status(400).json({ ok: false, error: "Invalid threadId" });

    const threadRes = await pool.query(
      `SELECT user_a_id, user_b_id FROM contact_threads WHERE id = $1`,
      [threadId]
    );
    if (!threadRes.rows.length) return res.status(404).json({ ok: false, error: "Thread not found" });

    const thread = threadRes.rows[0];
    if (![thread.user_a_id, thread.user_b_id].includes(req.user.id)) {
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
    console.error("GET /api/contact/threads/:id/messages ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/threads/:threadId/messages", requireAuth, async (req, res) => {
  try {
    const threadId = String(req.params.threadId || "");
    const body = String(req.body?.body || "").trim();
    if (!threadId) return res.status(400).json({ ok: false, error: "Invalid threadId" });
    if (!body) return res.status(400).json({ ok: false, error: "Message body is required" });

    const threadRes = await pool.query(
      `SELECT user_a_id, user_b_id FROM contact_threads WHERE id = $1`,
      [threadId]
    );
    if (!threadRes.rows.length) return res.status(404).json({ ok: false, error: "Thread not found" });

    const thread = threadRes.rows[0];
    if (![thread.user_a_id, thread.user_b_id].includes(req.user.id)) {
      return res.status(403).json({ ok: false, error: "Not allowed" });
    }

    const otherUserId = thread.user_a_id === req.user.id ? thread.user_b_id : thread.user_a_id;

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
      return res.status(403).json({
        ok: false,
        error: "Upgrade required: influencers can message brands only with a premium account.",
      });
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
    console.error("POST /api/contact/threads/:id/messages ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
