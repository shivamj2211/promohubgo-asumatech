const pool = require("../db");
const { prisma } = require("../lib/prisma");

const USERNAME_CHANGE_MAX = 1; // 🔒 allow only once (after initial set)
const USERNAME_COOLDOWN_DAYS = 30; // 🕒 30-day cooldown from signup (createdAt)

async function getUsernameChangeStats(userId) {
  try {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS cnt, MAX(changed_at) AS last_changed_at
       FROM username_history
       WHERE user_id = $1`,
      [userId]
    );
    return {
      cnt: r.rows[0]?.cnt ?? 0,
      lastChangedAt: r.rows[0]?.last_changed_at ? new Date(r.rows[0].last_changed_at) : null,
    };
  } catch (e) {
    // If table doesn't exist yet, treat as no changes
    return { cnt: 0, lastChangedAt: null };
  }
}

function daysSince(date) {
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Rule:
 * - Initial username set is always allowed (if user.username is null/empty).
 * - After username is already set:
 *    - Allow only 1 change total (tracked in username_history)
 *    - Only after 30 days from account createdAt
 */
async function canChangeUsernameOnceAfterCooldown(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, createdAt: true },
  });
  if (!user) return { ok: false, reason: "USER_NOT_FOUND", waitDays: null };

  const currentUsername = user.username ? String(user.username).trim().toLowerCase() : null;

  // ✅ Initial set is allowed (no cooldown / no limit)
  if (!currentUsername) {
    return { ok: true, reason: null, waitDays: null, isInitialSet: true, currentUsername: null, createdAt: user.createdAt };
  }

  const { cnt } = await getUsernameChangeStats(userId);

  // 🔒 only once
  if (cnt >= USERNAME_CHANGE_MAX) {
    return { ok: false, reason: "USERNAME_CHANGE_LIMIT", waitDays: null, isInitialSet: false, currentUsername, createdAt: user.createdAt };
  }

  // 🕒 cooldown from signup
  const baseDate = user.createdAt ? new Date(user.createdAt) : null;
  if (baseDate) {
    const passed = daysSince(baseDate);
    if (passed < USERNAME_COOLDOWN_DAYS) {
      return {
        ok: false,
        reason: "USERNAME_COOLDOWN",
        waitDays: USERNAME_COOLDOWN_DAYS - passed,
        isInitialSet: false,
        currentUsername,
        createdAt: user.createdAt,
      };
    }
  }

  return { ok: true, reason: null, waitDays: null, isInitialSet: false, currentUsername, createdAt: user.createdAt };
}

module.exports = {
  USERNAME_CHANGE_MAX,
  USERNAME_COOLDOWN_DAYS,
  canChangeUsernameOnceAfterCooldown,
};
