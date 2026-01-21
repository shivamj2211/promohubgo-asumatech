const express = require("express");
const pool = require("../db");

const router = express.Router();

function resolveTable(role) {
  if (role === "influencer") return "influencer_values";
  if (role === "brand") return "brand_values";
  return null;
}

// Public read: GET /api/values/:role?key=languages
router.get("/:role", async (req, res) => {
  try {
    const role = String(req.params.role || "").toLowerCase();
    const table = resolveTable(role);
    if (!table) return res.status(400).json({ ok: false, error: "Invalid role" });

    const key = String(req.query.key || "").trim();
    if (!key) return res.status(400).json({ ok: false, error: "key is required" });

    const { rows } = await pool.query(
      `
        SELECT id, key, value, label, meta, sort_order
        FROM ${table}
        WHERE key = $1 AND is_active = true
        ORDER BY sort_order ASC, id ASC
      `,
      [key]
    );

    const data = rows.map((row) => ({
      value: row.value,
      label: row.label,
      meta: row.meta,
      sortOrder: row.sort_order,
    }));

    return res.json({ ok: true, data });
  } catch (e) {
    console.error("GET /api/values ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
