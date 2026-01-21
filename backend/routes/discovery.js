const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/discovery/influencers?page=1&limit=12
router.get("/influencers", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 12);
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u."countryCode",
        u."onboardingCompleted",
        ip.title,
        ip.description,
        MAX(isoc.followers) AS followers,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT ic.key), NULL) AS categories
      FROM users u
      LEFT JOIN "InfluencerProfile" ip ON ip."userId" = u.id
      LEFT JOIN "InfluencerCategory" ic ON ic."userId" = u.id
      LEFT JOIN "InfluencerSocial" isoc ON isoc."userId" = u.id
      WHERE u.role = 'INFLUENCER' AND u."onboardingCompleted" = true
      GROUP BY u.id, ip.title, ip.description
      ORDER BY u."createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE role = 'INFLUENCER' AND "onboardingCompleted" = true`
    );

    return res.json({
      ok: true,
      data: rows,
      page,
      limit,
      total: totalRes.rows?.[0]?.count || 0,
    });
  } catch (e) {
    console.error("GET /api/discovery/influencers ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
