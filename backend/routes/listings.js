const express = require("express");
const pool = require("../db");

const router = express.Router();

function normalizeType(input) {
  const value = String(input || "").toLowerCase();
  if (value === "influencer" || value === "brand") return value;
  return null;
}

function normalizeSort(input) {
  const value = String(input || "").toLowerCase();
  if (value === "oldest") return "oldest";
  return "newest";
}

router.get("/", async (req, res) => {
  try {
    const type = normalizeType(req.query.type);
    if (!type) return res.status(400).json({ ok: false, error: "Invalid type" });

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 12);
    const offset = (page - 1) * limit;
    const q = String(req.query.q || "").trim().toLowerCase();
    const category = String(req.query.category || "").trim().toLowerCase();
    const sort = normalizeSort(req.query.sort);

    if (type === "influencer") {
      const params = [];
      const where = [`u.role = 'INFLUENCER'`, `u."onboardingCompleted" = true`];

      if (q) {
        params.push(`%${q}%`);
        where.push(
          `(LOWER(COALESCE(u.name, '')) LIKE $${params.length} OR LOWER(COALESCE(u.username, '')) LIKE $${params.length} OR LOWER(COALESCE(u.email, '')) LIKE $${params.length} OR LOWER(COALESCE(ip.title, '')) LIKE $${params.length})`
        );
      }

      if (category && category !== "all") {
        params.push(category);
        where.push(
          `EXISTS (SELECT 1 FROM "InfluencerCategory" ic2 WHERE ic2."userId" = u.id AND LOWER(ic2.key) = $${params.length})`
        );
      }

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const orderClause = sort === "oldest" ? `ORDER BY u."createdAt" ASC` : `ORDER BY u."createdAt" DESC`;

      params.push(limit, offset);
      const { rows } = await pool.query(
        `
          SELECT
            u.id,
            u.name,
            u.username,
            u.email,
            ip.title,
            ul.district,
            ul.statename,
            MAX(isoc.followers) AS followers,
            COUNT(DISTINCT isoc.platform) AS platform_count,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT ic.key), NULL) AS categories,
            im.url AS avatar_url
          FROM users u
          LEFT JOIN "InfluencerProfile" ip ON ip."userId" = u.id
          LEFT JOIN "InfluencerCategory" ic ON ic."userId" = u.id
          LEFT JOIN "InfluencerSocial" isoc ON isoc."userId" = u.id
          LEFT JOIN "UserLocation" ul ON ul."userId" = u.id
          LEFT JOIN LATERAL (
            SELECT url
            FROM "InfluencerMedia"
            WHERE "userId" = u.id AND "type" = 'PROFILE'
            ORDER BY "sortOrder" ASC NULLS LAST, "createdAt" ASC
            LIMIT 1
          ) im ON true
          ${whereClause}
          GROUP BY u.id, ip.title, ul.district, ul.statename, im.url
          ${orderClause}
          LIMIT $${params.length - 1} OFFSET $${params.length}
        `,
        params
      );

      const countParams = params.slice(0, params.length - 2);
      const countRes = await pool.query(
        `
          SELECT COUNT(DISTINCT u.id)::int AS count
          FROM users u
          LEFT JOIN "InfluencerProfile" ip ON ip."userId" = u.id
          ${whereClause}
        `,
        countParams
      );

      const items = rows.map((row) => {
        const displayName = row.name || row.username || row.email || "Influencer";
        const locationLabel = row.district && row.statename
          ? `${row.district}, ${row.statename}`
          : row.statename || row.district || null;

        return {
          id: row.id,
          type: "INFLUENCER",
          displayName,
          title: row.title || "Influencer Profile",
          username: row.username,
          avatarUrl: row.avatar_url || null,
          categories: row.categories || [],
          locationLabel,
          stats: {
            followers: row.followers || null,
            engagement: null,
            platforms: Number(row.platform_count) || 0,
          },
        };
      });

      return res.json({
        ok: true,
        data: {
          items,
          page,
          limit,
          total: countRes.rows?.[0]?.count || 0,
        },
      });
    }

    const params = [];
    const where = [`u.role = 'BRAND'`, `u."onboardingCompleted" = true`];

    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(LOWER(COALESCE(u.name, '')) LIKE $${params.length} OR LOWER(COALESCE(u.username, '')) LIKE $${params.length} OR LOWER(COALESCE(u.email, '')) LIKE $${params.length} OR LOWER(COALESCE(bp."businessType", '')) LIKE $${params.length})`
      );
    }

    if (category && category !== "all") {
      params.push(category);
      where.push(
        `EXISTS (SELECT 1 FROM "BrandCategory" bc2 WHERE bc2."userId" = u.id AND LOWER(bc2.key) = $${params.length})`
      );
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderClause = sort === "oldest" ? `ORDER BY u."createdAt" ASC` : `ORDER BY u."createdAt" DESC`;

    params.push(limit, offset);
    const { rows } = await pool.query(
      `
        SELECT
          u.id,
          u.name,
          u.username,
          u.email,
          bp."businessType" AS business_type,
          bp."approxBudget" AS approx_budget,
          ul.district,
          ul.statename,
          COUNT(DISTINCT bpl.key) AS platform_count,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT bc.key), NULL) AS categories,
          bm.url AS avatar_url
        FROM users u
        LEFT JOIN "BrandProfile" bp ON bp."userId" = u.id
        LEFT JOIN "BrandCategory" bc ON bc."userId" = u.id
        LEFT JOIN "BrandPlatform" bpl ON bpl."userId" = u.id
        LEFT JOIN "UserLocation" ul ON ul."userId" = u.id
        LEFT JOIN LATERAL (
          SELECT url
          FROM "BrandMedia"
          WHERE "userId" = u.id AND "type" = 'PROFILE'
          ORDER BY "sortOrder" ASC NULLS LAST, "createdAt" ASC
          LIMIT 1
        ) bm ON true
        ${whereClause}
        GROUP BY u.id, bp."businessType", bp."approxBudget", ul.district, ul.statename, bm.url
        ${orderClause}
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const countRes = await pool.query(
      `
        SELECT COUNT(DISTINCT u.id)::int AS count
        FROM users u
        LEFT JOIN "BrandProfile" bp ON bp."userId" = u.id
        ${whereClause}
      `,
      countParams
    );

    const items = rows.map((row) => {
      const displayName = row.name || row.username || row.email || "Brand";
      const locationLabel = row.district && row.statename
        ? `${row.district}, ${row.statename}`
        : row.statename || row.district || null;

      return {
        id: row.id,
        type: "BRAND",
        displayName,
        title: row.business_type || "Brand",
        username: row.username,
        avatarUrl: row.avatar_url || null,
        categories: row.categories || [],
        locationLabel,
        stats: {
          businessType: row.business_type || null,
          budgetRange: row.approx_budget || null,
          platforms: Number(row.platform_count) || 0,
        },
      };
    });

    return res.json({
      ok: true,
      data: {
        items,
        page,
        limit,
        total: countRes.rows?.[0]?.count || 0,
      },
    });
  } catch (e) {
    console.error("GET /api/listings ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
