const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/cities?pincode=110001
 * GET /api/cities?q=delhi
 */
router.get("/", async (req, res) => {
  try {
    const { pincode, q } = req.query;

    // 🔹 PINCODE SEARCH
  // 🔹 PINCODE SEARCH
if (pincode) {
  const pin = String(pincode).trim();

  // optional guard
  if (!/^\d{6}$/.test(pin)) return res.json({ ok: true, data: [] });

  const { rows } = await pool.query(
    `
    SELECT officename, pincode, district, statename, latitude, longitude
    FROM pincode_offices
    WHERE pincode = $1::text
    ORDER BY officename
    `,
    [pin]
  );

  return res.json({ ok: true, data: rows });
}



    // 🔹 CITY / STATE SEARCH
    if (q) {
      const search = `%${q.toLowerCase()}%`;
      const { rows } = await pool.query(
        `
        SELECT DISTINCT district, statename
        FROM pincode_offices
        WHERE LOWER(district) LIKE $1
           OR LOWER(statename) LIKE $1
        LIMIT 20
        `,
        [search]
      );

      return res.json({
        ok: true,
        data: rows.map((r) => ({
          city: r.district,
          state: r.statename,
        })),
      });
    }

    return res.json({ ok: true, data: [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "DB error" });
  }
});

module.exports = router;
