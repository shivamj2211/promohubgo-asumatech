const jwt = require("jsonwebtoken");
const { COOKIE_NAME } = require("../utils/jwt");
const { prisma } = require("../lib/prisma");

async function requireAuth(req, res, next) {
  try {
    const token =
      req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isAdmin: true, isLocked: true },
    });

    if (!user) return res.status(401).json({ ok: false, error: "Unauthorized" });
    if (user.isLocked) return res.status(403).json({ ok: false, error: "Account locked" });

    req.user = { id: user.id, isAdmin: user.isAdmin, isLocked: user.isLocked };
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ ok: false, error: "Admin access required" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
