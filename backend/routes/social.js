const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { decrypt } = require("../utils/crypto");

const router = express.Router();

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    const err = new Error(`Missing ${key} in .env`);
    err.code = "MISSING_ENV";
    throw err;
  }
  return value;
}

function nowPlusSeconds(seconds) {
  return seconds ? new Date(Date.now() + seconds * 1000) : null;
}

async function refreshInstagram(conn) {
  const token = decrypt(conn.accessToken, requireEnv("ENCRYPTION_KEY"));
  if (!token || !conn.accountId) {
    throw new Error("Missing Instagram token or accountId");
  }
  const igRes = await fetch(
    `https://graph.facebook.com/v19.0/${conn.accountId}?fields=id,username,followers_count,media_count,account_type,profile_picture_url&access_token=${encodeURIComponent(token)}`
  );
  const igData = await igRes.json();
  if (igData?.error) throw new Error(igData.error?.message || "Instagram API error");

  const stats = {
    platform: "instagram",
    username: igData?.username || null,
    followersCount: igData?.followers_count ?? null,
    mediaCount: igData?.media_count ?? null,
    accountType: igData?.account_type || null,
    profilePictureUrl: igData?.profile_picture_url || null,
  };
  return stats;
}

async function refreshYoutube(conn) {
  const token = decrypt(conn.accessToken, requireEnv("ENCRYPTION_KEY"));
  if (!token) throw new Error("Missing YouTube access token");
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const channelData = await channelRes.json();
  if (channelData?.error) throw new Error(channelData.error?.message || "YouTube API error");
  const channel = Array.isArray(channelData?.items) ? channelData.items[0] : null;
  const stats = {
    platform: "youtube",
    channelId: channel?.id || null,
    channelTitle: channel?.snippet?.title || null,
    subscribersCount: channel?.statistics?.subscriberCount || null,
    totalViews: channel?.statistics?.viewCount || null,
    videoCount: channel?.statistics?.videoCount || null,
    publishedAt: channel?.snippet?.publishedAt || null,
    country: channel?.snippet?.country || null,
  };
  return stats;
}

router.get("/status", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connections = await prisma.socialConnection.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        platform: true,
        verified: true,
        stats: true,
        createdAt: true,
        lastFetchedAt: true,
        fetchStatus: true,
        errorMessage: true,
      },
    });
    return res.json({ ok: true, connections });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

router.post("/refresh", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const platform = String(req.body?.platform || "").toLowerCase();
    if (!platform) return res.status(400).json({ ok: false, error: "platform is required" });

    const conn = await prisma.socialConnection.findUnique({
      where: { userId_platform: { userId, platform } },
    });
    if (!conn) return res.status(404).json({ ok: false, error: "Connection not found" });

    let stats = null;
    if (platform === "instagram") stats = await refreshInstagram(conn);
    else if (platform === "youtube") stats = await refreshYoutube(conn);
    else return res.status(400).json({ ok: false, error: "Unsupported platform" });

    await prisma.socialConnection.update({
      where: { userId_platform: { userId, platform } },
      data: { stats, verified: true, lastFetchedAt: new Date(), fetchStatus: "OK", errorMessage: null },
    });
    await prisma.socialStatsSnapshot.create({ data: { userId, platform, stats } });

    return res.json({ ok: true, stats });
  } catch (e) {
    try {
      const platform = String(req.body?.platform || "").toLowerCase();
      if (platform) {
        await prisma.socialConnection.update({
          where: { userId_platform: { userId: req.user.id, platform } },
          data: { fetchStatus: "ERROR", errorMessage: e?.message || "Refresh failed" },
        });
      }
    } catch {}
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

module.exports = router;
