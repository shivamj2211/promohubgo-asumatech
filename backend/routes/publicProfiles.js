const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * Public influencer profile (no auth)
 * GET /api/public/influencers/:id
 */
router.get("/influencers/:id", async (req, res) => {
  try {
    const id = String(req.params.id);

    // users + influencer_profiles join (safe public fields only)
    const q = `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        ip.bio,
        ip.city,
        ip.state,
        ip.country,
        ip.profile_image_url,
        ip.instagram_handle,
        ip.instagram_followers,
        ip.is_verified
      FROM users u
      JOIN influencer_profiles ip ON ip.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `;
    const r = await pool.query(q, [id]);
    if (!r.rows.length) return res.status(404).json({ ok: false, error: "Influencer not found" });

    // demo packages (abhi DB table nahi hai, later table bana ke dynamic kar dena)
    const packages = [
      { code: "ig_photo", title: "1 Instagram Photo Feed Post", price: 350, desc: "High-quality photo + caption + tag/mention." },
      { code: "ig_reel", title: "1 Instagram Reel (60 Seconds)", price: 450, desc: "60s reel using / discussing product with CTA." },
      { code: "ugc_review", title: "1 UGC Testimonial/Review", price: 300, desc: "Short review + raw assets sent to brand." },
    ];

    return res.json({ ok: true, influencer: r.rows[0], packages });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
