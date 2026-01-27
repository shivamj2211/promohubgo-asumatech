const express = require("express");
const pool = require("../db");
const { prisma } = require("../lib/prisma");

const router = express.Router();

function buildLocationLabel(location) {
  if (!location) return null;
  const district = location.district;
  const statename = location.statename;
  if (district && statename) return `${district}, ${statename}`;
  return statename || district || null;
}

/**
 * ✅ DB-safe query helper:
 * - If a column is missing (ex: is_premium), retry with fallback SQL.
 * - If table is missing, retry with fallback SQL.
 */
async function safeQuery(primarySql, primaryParams, fallbackSql, fallbackParams) {
  try {
    return await pool.query(primarySql, primaryParams);
  } catch (e) {
    if (!fallbackSql) throw e;
    return await pool.query(fallbackSql, fallbackParams ?? primaryParams);
  }
}

/**
 * ✅ Resolve identifier -> userId
 * Accepts:
 * - username (current)
 * - old username (username_history)
 * - influencerProfileId / brandProfileId
 * - userId (uuid)
 *
 * Returns:
 * { userId, type, shouldRedirect, canonicalUsername }
 */
async function resolveUserIdentifier(identifier) {
  const clean = String(identifier || "").trim();
  const lower = clean.toLowerCase();
  if (!clean) {
    return { userId: null, type: null, shouldRedirect: false, canonicalUsername: null };
  }

  // 1) Try CURRENT username in users (case-insensitive)
  try {
    const byUsernameUsers = await pool.query(
      `SELECT id, username, role FROM users WHERE LOWER(username) = $1 LIMIT 1`,
      [lower]
    );
    if (byUsernameUsers.rows.length) {
      const u = byUsernameUsers.rows[0];
      return {
        userId: u.id,
        type: String(u.role || "").toUpperCase() || null,
        shouldRedirect: false,
        canonicalUsername: u.username || null,
      };
    }
  } catch {}

  // 2) Try CURRENT username in "User" (case-insensitive)
  try {
    const byUsernamePrisma = await pool.query(
      `SELECT id, username, role FROM "User" WHERE LOWER(username) = $1 LIMIT 1`,
      [lower]
    );
    if (byUsernamePrisma.rows.length) {
      const u = byUsernamePrisma.rows[0];
      return {
        userId: u.id,
        type: String(u.role || "").toUpperCase() || null,
        shouldRedirect: false,
        canonicalUsername: u.username || null,
      };
    }
  } catch {}

  // 3) Try OLD username in username_history (case-insensitive) -> get userId -> fetch current username
  try {
    const hist = await pool.query(
      `SELECT user_id FROM username_history WHERE LOWER(old_username) = $1 LIMIT 1`,
      [lower]
    );

    if (hist.rows.length) {
      const userId = hist.rows[0].user_id;

      let canonical = null;
      let role = null;

      // fetch canonical current username from users or "User"
      try {
        const u1 = await pool.query(
          `SELECT username, role FROM users WHERE id = $1 LIMIT 1`,
          [userId]
        );
        if (u1.rows.length) {
          canonical = u1.rows[0].username || null;
          role = u1.rows[0].role || null;
        }
      } catch {}

      if (!canonical) {
        try {
          const u2 = await pool.query(
            `SELECT username, role FROM "User" WHERE id = $1 LIMIT 1`,
            [userId]
          );
          if (u2.rows.length) {
            canonical = u2.rows[0].username || null;
            role = u2.rows[0].role || null;
          }
        } catch {}
      }

      return {
        userId,
        type: String(role || "").toUpperCase() || null,
        shouldRedirect: Boolean(canonical && canonical.toLowerCase() !== lower),
        canonicalUsername: canonical || null,
      };
    }
  } catch {}

  // 4) Try profileId -> userId (InfluencerProfile / BrandProfile)
  try {
    const influencerRes = await pool.query(
      `SELECT "userId" FROM "InfluencerProfile" WHERE id = $1`,
      [clean]
    );
    if (influencerRes.rows.length) {
      return {
        userId: influencerRes.rows[0].userId,
        type: "INFLUENCER",
        shouldRedirect: false,
        canonicalUsername: null,
      };
    }
  } catch {}

  try {
    const brandRes = await pool.query(
      `SELECT "userId" FROM "BrandProfile" WHERE id = $1`,
      [clean]
    );
    if (brandRes.rows.length) {
      return {
        userId: brandRes.rows[0].userId,
        type: "BRAND",
        shouldRedirect: false,
        canonicalUsername: null,
      };
    }
  } catch {}

  // 5) Fallback: treat as userId (uuid)
  return { userId: clean, type: null, shouldRedirect: false, canonicalUsername: null };
}

async function resolveUserByUsername(username) {
  const clean = String(username || "").trim();
  const lower = clean.toLowerCase();
  if (!clean) {
    return { userId: null, type: null, shouldRedirect: false, canonicalUsername: null };
  }

  // 1) Try CURRENT username in users (case-insensitive)
  try {
    const byUsernameUsers = await pool.query(
      `SELECT id, username, role FROM users WHERE LOWER(username) = $1 LIMIT 1`,
      [lower]
    );
    if (byUsernameUsers.rows.length) {
      const u = byUsernameUsers.rows[0];
      return {
        userId: u.id,
        type: String(u.role || "").toUpperCase() || null,
        shouldRedirect: false,
        canonicalUsername: u.username || null,
      };
    }
  } catch {}

  // 2) Try CURRENT username in "User" (case-insensitive)
  try {
    const byUsernamePrisma = await pool.query(
      `SELECT id, username, role FROM "User" WHERE LOWER(username) = $1 LIMIT 1`,
      [lower]
    );
    if (byUsernamePrisma.rows.length) {
      const u = byUsernamePrisma.rows[0];
      return {
        userId: u.id,
        type: String(u.role || "").toUpperCase() || null,
        shouldRedirect: false,
        canonicalUsername: u.username || null,
      };
    }
  } catch {}

  // 3) Try OLD username in username_history (case-insensitive)
  try {
    const hist = await pool.query(
      `SELECT user_id FROM username_history WHERE LOWER(old_username) = $1 LIMIT 1`,
      [lower]
    );

    if (hist.rows.length) {
      const userId = hist.rows[0].user_id;

      let canonical = null;
      let role = null;

      try {
        const u1 = await pool.query(
          `SELECT username, role FROM users WHERE id = $1 LIMIT 1`,
          [userId]
        );
        if (u1.rows.length) {
          canonical = u1.rows[0].username || null;
          role = u1.rows[0].role || null;
        }
      } catch {}

      if (!canonical) {
        try {
          const u2 = await pool.query(
            `SELECT username, role FROM "User" WHERE id = $1 LIMIT 1`,
            [userId]
          );
          if (u2.rows.length) {
            canonical = u2.rows[0].username || null;
            role = u2.rows[0].role || null;
          }
        } catch {}
      }

      return {
        userId,
        type: String(role || "").toUpperCase() || null,
        shouldRedirect: Boolean(canonical && canonical.toLowerCase() !== lower),
        canonicalUsername: canonical || null,
      };
    }
  } catch {}

  return { userId: null, type: null, shouldRedirect: false, canonicalUsername: null };
}

async function loadUserRow(userId) {
  /**
   * ✅ Works in both cases:
   * 1) Raw SQL table: users(id, name, username, email, role, is_premium)
   * 2) Prisma baseline table: "User"(id, name, username, email, role) and maybe no is_premium
   */
  const q1 = `SELECT id, name, username, email, role, is_premium FROM users WHERE id = $1`;
  const q1Fallback = `SELECT id, name, username, email, role, false as is_premium FROM users WHERE id = $1`;
  const q2 = `SELECT id, name, username, email, role, false as is_premium FROM "User" WHERE id = $1`;

  try {
    const res1 = await safeQuery(q1, [userId], q1Fallback, [userId]);
    if (res1.rows.length) return res1.rows[0];
  } catch {}

  try {
    const res2 = await pool.query(q2, [userId]);
    if (res2.rows.length) return res2.rows[0];
  } catch {}

  return null;
}

async function buildPublicProfile(userId, preferredType) {
  const user = await loadUserRow(userId);
  if (!user) return null;

  const role = preferredType || String(user.role || "").toUpperCase();
  if (!["INFLUENCER", "BRAND"].includes(role)) return null;

  // Location is optional — if table exists, good; else ignore.
  let location = null;
  try {
    const locationRes = await pool.query(
      `SELECT district, statename, officename, fullAddress, pincode FROM "UserLocation" WHERE "userId" = $1`,
      [userId]
    );
    location = locationRes.rows[0] || null;
  } catch {
    location = null;
  }
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

    const platforms = (profile.platforms || profile.languages || []) || [];
    const maxFollowers = socialsRes.rows.reduce((acc, r) => {
      const v = r.followers ? String(r.followers) : null;
      if (!v) return acc;
      return acc || v;
    }, null);

    return {
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
        title: profile.title || null,
        description: profile.description || null,
        categories,
        socials,
        media,
        locationLabel,
        platforms: platforms || [],
      },
      stats: {
        platforms: socialsRes.rows.length ? new Set(socialsRes.rows.map((s) => s.platform)).size : 0,
        followers: maxFollowers || null,
      },
    };
  }

  // BRAND
  const [brandProfileRes, brandMediaRes] = await Promise.all([
    pool.query(
      `
        SELECT business_type, title, description, here_to_do, approx_budget, platforms
        FROM "BrandProfile"
        WHERE "userId" = $1
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

  const profile = brandProfileRes.rows[0] || {};
  const media = {
    profile: brandMediaRes.rows.filter((row) => row.type === "PROFILE").map((row) => row.url),
    cover: brandMediaRes.rows.filter((row) => row.type === "COVER").map((row) => row.url),
  };

  return {
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
      title: profile.title || null,
      description: profile.description || null,
      business_type: profile.business_type || null,
      here_to_do: profile.here_to_do || null,
      approx_budget: profile.approx_budget || null,
      platforms: profile.platforms || [],
      socials: [],
      media,
      locationLabel,
    },
    stats: {
      businessType: profile.business_type || null,
      budgetRange: profile.approx_budget || null,
    },
  };
}

router.get("/profile/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ ok: false, error: "Invalid userId" });

    const data = await buildPublicProfile(userId, null);
    if (!data) return res.status(404).json({ ok: false, error: "Profile not found" });
    return res.json(data);
  } catch (e) {
    console.error("GET /api/public/profile ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/influencers/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim();
    if (!username) return res.status(400).json({ ok: false, error: "Invalid username" });

    let resolved = await resolveUserByUsername(username);
    if (!resolved.userId) {
      resolved = await resolveUserIdentifier(username);
    }
    if (!resolved.userId) return res.status(400).json({ ok: false, error: "Invalid username" });

    const data = await buildPublicProfile(resolved.userId, resolved.type);
    if (!data) return res.status(404).json({ ok: false, error: "Profile not found" });

    return res.json({
      ...data,
      canonicalUsername: resolved.canonicalUsername || data?.user?.username || null,
      shouldRedirect: Boolean(resolved.shouldRedirect),
      requested: username,
    });
  } catch (e) {
    console.error("GET /api/public/influencers ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/packages/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim();
    if (!username) return res.status(400).json({ ok: false, error: "Invalid username" });

    let resolved = await resolveUserByUsername(username);
    if (!resolved.userId) {
      resolved = await resolveUserIdentifier(username);
    }
    if (!resolved.userId) return res.status(404).json({ ok: false, error: "Profile not found" });

    const packages = await prisma.influencerPackage.findMany({
      where: {
        userId: resolved.userId,
        isActive: true,
      },
      orderBy: { price: "asc" },
    });

    return res.json(packages);
  } catch (e) {
    console.error("GET /api/public/packages ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * GET /api/public/sanity/:username
 * Quick sanity snapshot for seeded creator data
 */
router.get("/sanity/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim();
    if (!username) return res.status(400).json({ ok: false, error: "Invalid username" });

    let resolved = await resolveUserByUsername(username);
    if (!resolved.userId) {
      resolved = await resolveUserIdentifier(username);
    }
    if (!resolved.userId) return res.status(404).json({ ok: false, error: "Profile not found" });

    const profile = await buildPublicProfile(resolved.userId, resolved.type);

    const packages = await prisma.influencerPackage.findMany({
      where: { userId: resolved.userId, isActive: true },
      include: { analytics: true },
      orderBy: { price: "asc" },
    });

    const orders = await prisma.order.findMany({
      where: { listingId: { in: packages.map((p) => p.id) } },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      ok: true,
      userId: resolved.userId,
      username: profile?.user?.username || username,
      profile,
      packages: packages.map((p) => ({
        id: p.id,
        title: p.title,
        platform: p.platform,
        price: p.price,
        analytics: p.analytics || { views: 0, clicks: 0, saves: 0, orders: 0 },
      })),
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        listingId: o.listingId,
        totalPrice: o.totalPrice,
        createdAt: o.createdAt,
      })),
    });
  } catch (e) {
    console.error("GET /api/public/sanity ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
