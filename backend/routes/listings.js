const express = require("express");
const pool = require("../db");

const router = express.Router();

function parseCsvList(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v.join(",");
  return String(v)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeType(input) {
  const value = String(input || "").toLowerCase();
  if (value === "influencer" || value === "brand") return value;
  return null;
}

function normalizeSort(input) {
  const value = String(input || "").toLowerCase();
  if (value === "followers") return "followers";
  if (value === "oldest") return "oldest";
  return "newest";
}

function normalizePlatform(input) {
  const v = String(input || "").trim().toLowerCase();
  if (!v || v === "any" || v === "all") return "";
  return v;
}

function normalizeLocation(input) {
  const v = String(input || "").trim().toLowerCase();
  if (!v || v === "any" || v === "all") return "";
  return v;
}

function normalizeBudget(input) {
  const v = String(input || "").trim().toLowerCase();
  if (!v || v === "any" || v === "all") return "";
  return v;
}

function normalizeFollowersMin(input) {
  const n = Number.parseInt(String(input || "").trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

// SQL expression to parse followers text -> numeric
const FOLLOWERS_NUM_EXPR = `
  CASE
    WHEN isoc.followers IS NULL OR TRIM(isoc.followers) = '' THEN NULL
    WHEN LOWER(isoc.followers) ~ '^[0-9]+(\\.[0-9]+)?\\s*k' THEN (REGEXP_REPLACE(LOWER(isoc.followers), '[^0-9\\.]', '', 'g')::numeric * 1000)
    WHEN LOWER(isoc.followers) ~ '^[0-9]+(\\.[0-9]+)?\\s*m' THEN (REGEXP_REPLACE(LOWER(isoc.followers), '[^0-9\\.]', '', 'g')::numeric * 1000000)
    ELSE NULLIF(REGEXP_REPLACE(isoc.followers, '[^0-9]', '', 'g'), '')::numeric
  END
`;

router.get("/", async (req, res) => {
  try {
    const type = normalizeType(req.query.type);
    if (!type) return res.status(400).json({ ok: false, error: "Invalid type" });

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 12);
    const offset = (page - 1) * limit;

    const q = String(req.query.q || "").trim().toLowerCase();

    // ✅ OLD single category support
    const category = String(req.query.category || "").trim().toLowerCase();

    // ✅ NEW multi categories
    const categories = parseCsvList(req.query.categories);

    const sort = normalizeSort(req.query.sort);

    const platform = normalizePlatform(req.query.platform);
    const location = normalizeLocation(req.query.location);
    const followersMin = normalizeFollowersMin(req.query.followersMin);
    const budget = normalizeBudget(req.query.budget);

    // ✅ NEW multi gender/languages/ageRanges
    const genders = parseCsvList(req.query.genders);
    const languages = parseCsvList(req.query.languages);
    const ageRanges = parseCsvList(req.query.ageRanges);

    const videography = String(req.query.videography || "").trim() === "1";

    // ---------- INFLUENCER ----------
    if (type === "influencer") {
      const params = [];
      const where = [`u.role = 'INFLUENCER'`, `u."onboardingCompleted" = true`];
      const having = [];

      if (q) {
        params.push(`%${q}%`);
        where.push(
          `(LOWER(COALESCE(u.name, '')) LIKE $${params.length}
            OR LOWER(COALESCE(u.username, '')) LIKE $${params.length}
            OR LOWER(COALESCE(u.email, '')) LIKE $${params.length}
            OR LOWER(COALESCE(ip.title, '')) LIKE $${params.length})`
        );
      }

      // ✅ categories (multi takes priority, fallback to single)
      if (categories.length) {
        params.push(categories);
        where.push(
          `EXISTS (
            SELECT 1 FROM "InfluencerCategory" ic2
            WHERE ic2."userId" = u.id AND LOWER(ic2.key) = ANY($${params.length}::text[])
          )`
        );
      } else if (category && category !== "all") {
        params.push(category);
        where.push(
          `EXISTS (SELECT 1 FROM "InfluencerCategory" ic2 WHERE ic2."userId" = u.id AND LOWER(ic2.key) = $${params.length})`
        );
      }

      // ✅ platform filter
      if (platform) {
        params.push(platform);
        where.push(
          `EXISTS (SELECT 1 FROM "InfluencerSocial" is2 WHERE is2."userId" = u.id AND LOWER(is2.platform) = $${params.length})`
        );
      }

      // ✅ location filter
      if (location) {
        params.push(`%${location}%`);
        where.push(
          `(LOWER(COALESCE(ul.district, '')) LIKE $${params.length}
            OR LOWER(COALESCE(ul.statename, '')) LIKE $${params.length})`
        );
      }

      // ✅ genders multi
      if (genders.length) {
        params.push(genders);
        where.push(`LOWER(COALESCE(ip.gender,'')) = ANY($${params.length}::text[])`);
      }

      // ✅ languages multi (ip.languages is text[])
      if (languages.length) {
        params.push(languages);
        where.push(`
          EXISTS (
            SELECT 1
            FROM unnest(COALESCE(ip.languages, ARRAY[]::text[])) l
            WHERE LOWER(l) = ANY($${params.length}::text[])
          )
        `);
      }

      // ✅ ageRanges multi (DOB -> dynamic age)
      // ageYears = DATE_PART('year', AGE(ip.dob))::int
      if (ageRanges.length) {
        const ors = [];
        for (const r of ageRanges) {
          const [minS, maxS] = String(r).split("-");
          const min = Number(minS);
          const max = Number(maxS);
          if (Number.isFinite(min) && Number.isFinite(max)) {
            params.push(min);
            const minIdx = params.length;
            params.push(max);
            const maxIdx = params.length;
            ors.push(`(COALESCE(DATE_PART('year', AGE(ip.dob))::int, 0) BETWEEN $${minIdx} AND $${maxIdx})`);
          }
        }
        if (ors.length) where.push(`(${ors.join(" OR ")})`);
      }

      // ✅ videography (category key)
      if (videography) {
        where.push(`
          EXISTS (
            SELECT 1
            FROM "InfluencerCategory" icv
            WHERE icv."userId" = u.id AND LOWER(icv.key) = 'videography'
          )
        `);
      }

      // ✅ followers min HAVING
      if (followersMin > 0) {
        params.push(followersMin);
        having.push(`COALESCE(MAX(${FOLLOWERS_NUM_EXPR}), 0) >= $${params.length}`);
      }

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const havingClause = having.length ? `HAVING ${having.join(" AND ")}` : "";
      const orderClause =
        sort === "followers"
          ? `ORDER BY ${FOLLOWERS_NUM_EXPR} DESC NULLS LAST, u."createdAt" DESC`
          : sort === "oldest"
            ? `ORDER BY u."createdAt" ASC`
            : `ORDER BY u."createdAt" DESC`;

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
            COALESCE(MAX(${FOLLOWERS_NUM_EXPR}), NULL) AS followers_num,
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
          ${havingClause}
          ${orderClause}
          LIMIT $${params.length - 1} OFFSET $${params.length}
        `,
        params
      );

      const countParams = params.slice(0, params.length - 2);

      const countRes = await pool.query(
        `
          SELECT COUNT(*)::int AS count FROM (
            SELECT u.id
            FROM users u
            LEFT JOIN "InfluencerProfile" ip ON ip."userId" = u.id
            LEFT JOIN "InfluencerCategory" ic ON ic."userId" = u.id
            LEFT JOIN "InfluencerSocial" isoc ON isoc."userId" = u.id
            LEFT JOIN "UserLocation" ul ON ul."userId" = u.id
            ${whereClause}
            GROUP BY u.id
            ${havingClause}
          ) x
        `,
        countParams
      );

      const items = rows.map((row) => {
        const displayName = row.name || row.username || row.email || "Influencer";
        const locationLabel =
          row.district && row.statename
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

    // ---------- BRAND ----------
    const params = [];
    const where = [`u.role = 'BRAND'`, `u."onboardingCompleted" = true`];

    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(LOWER(COALESCE(u.name, '')) LIKE $${params.length}
          OR LOWER(COALESCE(u.username, '')) LIKE $${params.length}
          OR LOWER(COALESCE(u.email, '')) LIKE $${params.length}
          OR LOWER(COALESCE(bp."businessType", '')) LIKE $${params.length})`
      );
    }

    // ✅ categories multi or single
    if (categories.length) {
      params.push(categories);
      where.push(
        `EXISTS (
          SELECT 1 FROM "BrandCategory" bc2
          WHERE bc2."userId" = u.id AND LOWER(bc2.key) = ANY($${params.length}::text[])
        )`
      );
    } else if (category && category !== "all") {
      params.push(category);
      where.push(
        `EXISTS (SELECT 1 FROM "BrandCategory" bc2 WHERE bc2."userId" = u.id AND LOWER(bc2.key) = $${params.length})`
      );
    }

    if (platform) {
      params.push(platform);
      where.push(
        `EXISTS (SELECT 1 FROM "BrandPlatform" bpl2 WHERE bpl2."userId" = u.id AND LOWER(bpl2.key) = $${params.length})`
      );
    }

    if (location) {
      params.push(`%${location}%`);
      where.push(
        `(LOWER(COALESCE(ul.district, '')) LIKE $${params.length}
          OR LOWER(COALESCE(ul.statename, '')) LIKE $${params.length})`
      );
    }

    if (budget) {
      params.push(`%${budget}%`);
      where.push(`LOWER(COALESCE(bp."approxBudget", '')) LIKE $${params.length}`);
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
        LEFT JOIN "UserLocation" ul ON ul."userId" = u.id
        ${whereClause}
      `,
      countParams
    );

    const items = rows.map((row) => {
      const displayName = row.name || row.username || row.email || "Brand";
      const locationLabel =
        row.district && row.statename
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
