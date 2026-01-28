const express = require("express");
const crypto = require("crypto");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const META_SCOPES = [
  "instagram_basic",
  "pages_show_list",
  "instagram_manage_insights",
  "pages_read_engagement",
].join(",");

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "openid",
  "email",
  "profile",
].join(" ");

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    const err = new Error(`Missing ${key} in .env`);
    err.code = "MISSING_ENV";
    throw err;
  }
  return value;
}

function toKeyBytes(input) {
  return crypto.createHash("sha256").update(String(input)).digest();
}

function encrypt(text) {
  const key = toKeyBytes(requireEnv("ENCRYPTION_KEY"));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(payload) {
  const key = toKeyBytes(requireEnv("ENCRYPTION_KEY"));
  const buf = Buffer.from(String(payload), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

function signState(payload) {
  const secret = requireEnv("OAUTH_STATE_SECRET");
  const json = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(json).digest("hex");
  return Buffer.from(`${sig}.${json}`).toString("base64");
}

function verifyState(state) {
  const secret = requireEnv("OAUTH_STATE_SECRET");
  const raw = Buffer.from(String(state), "base64").toString("utf8");
  const [sig, json] = raw.split(".", 2);
  const expected = crypto.createHmac("sha256", secret).update(json).digest("hex");
  if (!sig || sig !== expected) return null;
  return JSON.parse(json);
}

async function upsertConnection({ userId, platform, accountId, accessToken, refreshToken, expiresAt, stats }) {
  return prisma.socialConnection.upsert({
    where: { userId_platform: { userId, platform } },
    create: {
      userId,
      platform,
      accountId: accountId || null,
      accessToken: accessToken ? encrypt(accessToken) : null,
      refreshToken: refreshToken ? encrypt(refreshToken) : null,
      expiresAt: expiresAt || null,
      stats: stats || null,
      verified: true,
      lastFetchedAt: new Date(),
      fetchStatus: "OK",
      errorMessage: null,
    },
    update: {
      accountId: accountId || null,
      accessToken: accessToken ? encrypt(accessToken) : null,
      refreshToken: refreshToken ? encrypt(refreshToken) : null,
      expiresAt: expiresAt || null,
      stats: stats || null,
      verified: true,
      lastFetchedAt: new Date(),
      fetchStatus: "OK",
      errorMessage: null,
    },
  });
}

async function markBoosterCompleted(userId, boosterKey, meta) {
  const booster = await prisma.booster.findUnique({ where: { key: boosterKey } });
  if (!booster) return;
  await prisma.userBooster.upsert({
    where: { userId_boosterId: { userId, boosterId: booster.id } },
    create: { userId, boosterId: booster.id, status: "completed", completedAt: new Date(), meta: meta || undefined },
    update: { status: "completed", completedAt: new Date(), meta: meta || undefined },
  });
}

router.get("/meta/start", requireAuth, async (req, res) => {
  try {
    const platform = String(req.query.platform || "instagram").toLowerCase();
    if (platform !== "instagram") return res.status(400).send("Invalid platform");
    const appId = requireEnv("META_APP_ID");
    const redirectUri = requireEnv("META_REDIRECT_URI");

    const state = signState({ u: req.user.id, p: platform, t: Date.now() });
    const url =
      `https://www.facebook.com/v19.0/dialog/oauth` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${encodeURIComponent(META_SCOPES)}`;
    res.redirect(url);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "OAuth start failed" });
  }
});

router.get("/meta/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !state) return res.status(400).send("Missing code/state");

    const payload = verifyState(state);
    if (!payload?.u) return res.status(400).send("Invalid state");

    const appId = requireEnv("META_APP_ID");
    const appSecret = requireEnv("META_APP_SECRET");
    const redirectUri = requireEnv("META_REDIRECT_URI");

    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
        `?client_id=${encodeURIComponent(appId)}` +
        `&client_secret=${encodeURIComponent(appSecret)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${encodeURIComponent(code)}`
    );
    const tokenData = await tokenRes.json();
    const accessToken = tokenData?.access_token;
    const expiresIn = tokenData?.expires_in ? Number(tokenData.expires_in) : null;
    if (!accessToken) return res.status(400).send("Meta access token missing");

    let igAccountId = null;
    let username = null;
    let followers = null;
    let mediaCount = null;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`
    );
    const pagesData = await pagesRes.json();
    const firstWithIg = Array.isArray(pagesData?.data)
      ? pagesData.data.find((p) => p.instagram_business_account?.id)
      : null;

    if (firstWithIg?.instagram_business_account?.id) {
      igAccountId = firstWithIg.instagram_business_account.id;
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${igAccountId}?fields=id,username,followers_count,media_count&access_token=${encodeURIComponent(accessToken)}`
      );
      const igData = await igRes.json();
      username = igData?.username || null;
      followers = igData?.followers_count ?? null;
      mediaCount = igData?.media_count ?? null;
    }

    const stats = {
      platform: "instagram",
      username,
      followers,
      mediaCount,
    };

    await upsertConnection({
      userId: payload.u,
      platform: "instagram",
      accountId: igAccountId,
      accessToken,
      refreshToken: null,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      stats,
    });
    await prisma.socialStatsSnapshot.create({
      data: { userId: payload.u, platform: "instagram", stats },
    });

    if (username) {
      await prisma.influencerSocial.upsert({
        where: { userId_platform: { userId: payload.u, platform: "instagram" } },
        create: {
          userId: payload.u,
          platform: "instagram",
          username,
          followers: followers ? String(followers) : null,
          url: `https://instagram.com/${username}`,
        },
        update: {
          username,
          followers: followers ? String(followers) : null,
          url: `https://instagram.com/${username}`,
        },
      });
    }

    await markBoosterCompleted(payload.u, "connect-instagram", { verified: true });

    const redirect = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${redirect}/myaccount/boosters?connected=instagram`);
  } catch (e) {
    res.status(500).send("Meta OAuth callback failed");
  }
});

router.get("/google/start", requireAuth, async (req, res) => {
  try {
    const platform = String(req.query.platform || "youtube").toLowerCase();
    if (platform !== "youtube") return res.status(400).send("Invalid platform");
    const clientId = requireEnv("GOOGLE_CLIENT_ID");
    const redirectUri = requireEnv("GOOGLE_REDIRECT_URI");

    const state = signState({ u: req.user.id, p: platform, t: Date.now() });
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(GOOGLE_SCOPES)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(state)}`;
    res.redirect(url);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "OAuth start failed" });
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !state) return res.status(400).send("Missing code/state");

    const payload = verifyState(state);
    if (!payload?.u) return res.status(400).send("Invalid state");

    const clientId = requireEnv("GOOGLE_CLIENT_ID");
    const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
    const redirectUri = requireEnv("GOOGLE_REDIRECT_URI");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData?.access_token;
    const refreshToken = tokenData?.refresh_token || null;
    const expiresIn = tokenData?.expires_in ? Number(tokenData.expires_in) : null;
    if (!accessToken) return res.status(400).send("Google access token missing");

    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const channelData = await channelRes.json();
    const channel = Array.isArray(channelData?.items) ? channelData.items[0] : null;
    const channelId = channel?.id || null;
    const username = channel?.snippet?.title || null;
    const subscribers = channel?.statistics?.subscriberCount || null;
    const views = channel?.statistics?.viewCount || null;

    const stats = {
      platform: "youtube",
      channelId,
      title: username,
      subscribers: subscribers ? Number(subscribers) : null,
      views: views ? Number(views) : null,
    };

    await upsertConnection({
      userId: payload.u,
      platform: "youtube",
      accountId: channelId,
      accessToken,
      refreshToken,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      stats,
    });
    await prisma.socialStatsSnapshot.create({
      data: { userId: payload.u, platform: "youtube", stats },
    });

    if (channelId) {
      await prisma.influencerSocial.upsert({
        where: { userId_platform: { userId: payload.u, platform: "youtube" } },
        create: {
          userId: payload.u,
          platform: "youtube",
          username,
          followers: subscribers ? String(subscribers) : null,
          url: `https://www.youtube.com/channel/${channelId}`,
        },
        update: {
          username,
          followers: subscribers ? String(subscribers) : null,
          url: `https://www.youtube.com/channel/${channelId}`,
        },
      });
    }

    await markBoosterCompleted(payload.u, "connect-youtube", { verified: true });

    const redirect = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${redirect}/myaccount/boosters?connected=youtube`);
  } catch (e) {
    res.status(500).send("Google OAuth callback failed");
  }
});

module.exports = router;
