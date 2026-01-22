const express = require("express");
const { randomUUID } = require("crypto");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function createId() {
  if (typeof randomUUID === "function") return randomUUID();
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const toUserId = String(req.body?.toUserId || "").trim();
    const message = String(req.body?.message || "").trim();
    const listingId = req.body?.listingId ? String(req.body.listingId).trim() : null;

    if (!toUserId) return res.status(400).json({ ok: false, error: "toUserId is required" });
    if (!message) return res.status(400).json({ ok: false, error: "Message is required" });
    if (toUserId === req.user.id) {
      return res.status(400).json({ ok: false, error: "Cannot contact yourself" });
    }

    const userRes = await pool.query(`SELECT id FROM users WHERE id = $1`, [toUserId]);
    if (!userRes.rows.length) return res.status(404).json({ ok: false, error: "User not found" });

    const id = createId();
    await pool.query(
      `
        INSERT INTO contact_requests (id, from_user_id, to_user_id, listing_id, message, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
      `,
      [id, req.user.id, toUserId, listingId, message]
    );

    return res.json({ ok: true, requestId: id });
  } catch (e) {
    console.error("POST /api/contact-requests ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
