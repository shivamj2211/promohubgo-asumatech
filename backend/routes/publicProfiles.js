const express = require("express");
const pool = require("../db");

const router = express.Router();

function buildLocationLabel(location) {
  if (!location) return null;
  const district = location.district;
  const statename = location.statename;
  if (district && statename) return `${district}, ${statename}`;
  return statename || district || null;
}

router.get("/profile/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ ok: false, error: "Invalid userId" });

    const userRes = await pool.query(
      `SELECT id, name, username, email, role, is_premium FROM users WHERE id = $1`,
      [userId]
    );
    if (!userRes.rows.length) return res.status(404).json({ ok: false, error: "User not found" });

    const user = userRes.rows[0];
    const role = String(user.role || "").toUpperCase();
    if (!["INFLUENCER", "BRAND"].includes(role)) {
      return res.status(404).json({ ok: false, error: "Profile not found" });
    }

    const locationRes = await pool.query(
      `SELECT district, statename, officename, fullAddress, pincode FROM "UserLocation" WHERE "userId" = $1`,
      [userId]
    );
    const location = locationRes.rows[0] || null;
    const locationLabel = buildLocationLabel(location);

    if (role === "INFLUENCER") {
      const [profileRes, categoriesRes, socialsRes, mediaRes] = await Promise.all([
        pool.query(
          `
            SELECT gender, dob, title, description, languages
            FROM "InfluencerProfile"
            WHERE "userId" = $1
          `,
          [userId]
        ),
        pool.query(
          `
            SELECT key
            FROM "InfluencerCategory"
            WHERE "userId" = $1
            ORDER BY key ASC
          `,
          [userId]
        ),
        pool.query(
          `
            SELECT platform, username, url, followers
            FROM "InfluencerSocial"
            WHERE "userId" = $1
            ORDER BY "createdAt" ASC
          `,
          [userId]
        ),
        pool.query(
          `
            SELECT type, url
            FROM "InfluencerMedia"
            WHERE "userId" = $1
            ORDER BY "sortOrder" ASC NULLS LAST, "createdAt" ASC
          `,
          [userId]
        ),
      ]);

      const profile = profileRes.rows[0] || {};
      const categories = categoriesRes.rows.map((row) => row.key).filter(Boolean);
      const socials = socialsRes.rows.map((row) => ({
        platform: row.platform,
        username: row.username,
        url: row.url,
        followers: row.followers,
      }));

      const media = {
        profile: mediaRes.rows.filter((row) => row.type === "PROFILE").map((row) => row.url),
        cover: mediaRes.rows.filter((row) => row.type === "COVER").map((row) => row.url),
      };

      return res.json({
        ok: true,
        type: "influencer",
        user: {
          id: user.id,
          name: user.name || user.username || user.email || "Creator",
          username: user.username,
          email: user.email,
          role: user.role,
          isPremium: Boolean(user.is_premium),
        },
        profile: {
          ...profile,
          categories,
          socials,
          media,
          locationLabel,
        },
        stats: {
          platforms: socials.length,
          followers: socials[0]?.followers || null,
        },
      });
    }

    const [profileRes, categoriesRes, platformsRes, mediaRes] = await Promise.all([
      pool.query(
        `
          SELECT "hereToDo" AS here_to_do, "approxBudget" AS approx_budget, "businessType" AS business_type
          FROM "BrandProfile"
          WHERE "userId" = $1
        `,
        [userId]
      ),
      pool.query(
        `
          SELECT key
          FROM "BrandCategory"
          WHERE "userId" = $1
          ORDER BY key ASC
        `,
        [userId]
      ),
      pool.query(
        `
          SELECT key
          FROM "BrandPlatform"
          WHERE "userId" = $1
          ORDER BY key ASC
        `,
        [userId]
      ),
      pool.query(
        `
          SELECT type, url
          FROM "BrandMedia"
          WHERE "userId" = $1
          ORDER BY "sortOrder" ASC NULLS LAST, "createdAt" ASC
        `,
        [userId]
      ),
    ]);

    const profile = profileRes.rows[0] || {};
    const categories = categoriesRes.rows.map((row) => row.key).filter(Boolean);
    const platforms = platformsRes.rows.map((row) => row.key).filter(Boolean);
    const media = {
      profile: mediaRes.rows.filter((row) => row.type === "PROFILE").map((row) => row.url),
      cover: mediaRes.rows.filter((row) => row.type === "COVER").map((row) => row.url),
    };

    return res.json({
      ok: true,
      type: "brand",
      user: {
        id: user.id,
        name: user.name || user.username || user.email || "Brand",
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium: Boolean(user.is_premium),
      },
      profile: {
        ...profile,
        categories,
        platforms,
        media,
        locationLabel,
      },
      stats: {
        platforms: platforms.length,
        businessType: profile.business_type || null,
        budgetRange: profile.approx_budget || null,
      },
    });
  } catch (e) {
    console.error("GET /api/public/profile ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
