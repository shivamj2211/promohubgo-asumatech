const express = require("express");
const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma");
const { signToken, setAuthCookie, clearAuthCookie } = require("../utils/jwt");

const router = express.Router();
let verifyFirebaseIdToken = null;
try {
  ({ verifyFirebaseIdToken } = require("../firebaseAdmin"));
} catch (e) {
  // firebase optional
}

// Email+Password Signup
router.post("/signup-email", async (req, res) => {
  try {
    const {
      email,
      password,
      phone,
      country_code,
      username,
      role,
    } = req.body || {};

    // Basic validations
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password required" });
    }
    let trimmedUsername;
    if (username) {
      trimmedUsername = String(username).trim().toLowerCase();
      if (trimmedUsername.length < 6 || trimmedUsername.length > 18) {
        return res.status(400).json({ ok: false, error: "Username must be between 6 and 18 characters" });
      }
      if (!/^[a-z0-9._]+$/.test(trimmedUsername)) {
        return res.status(400).json({ ok: false, error: "Username may only contain lowercase letters, numbers, dots or underscores" });
      }
    }

    // Validate role
    const normalizedRole = String(role || "").toLowerCase();
    if (!["seller", "buyer", "influencer", "brand"].includes(normalizedRole)) {
      return res.status(400).json({ ok: false, error: "Invalid role" });
    }
    // Map incoming role to canonical value (seller=influencer, buyer=brand)
   const mappedRole =
  normalizedRole === "seller" || normalizedRole === "influencer"
    ? "INFLUENCER"
    : "BRAND";


    const lowerEmail = String(email).toLowerCase();

    const emailExists = await prisma.user.findUnique({
      where: { email: lowerEmail },
      select: { id: true },
    });
    if (emailExists) {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }

    // If username provided check uniqueness
    if (trimmedUsername) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: trimmedUsername },
        select: { id: true },
      });
      if (usernameExists) {
        return res.status(409).json({ ok: false, error: "Username already taken" });
      }
    }

    const hash = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.create({
      data: {
        email: lowerEmail,
        passwordHash: hash,
        phone: phone || null,
        countryCode: country_code || null,
        username: trimmedUsername || null,
        role: mappedRole,
        onboardingStep: 1,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });


    const token = signToken({ userId: user.id });
    setAuthCookie(res, token);

    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: lowerEmail,
        username: user.username || null,
        role: user.role,
        onboardingStep: user.onboardingStep,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// Email+Password Login
router.post("/login-email", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: "Email and password required" });

    const lower = String(email).toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: lower },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isLocked: true,
        role: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });
    if (!user || !user.passwordHash) return res.status(401).json({ ok: false, error: "Invalid credentials" });
    if (user.isLocked) return res.status(403).json({ ok: false, error: "Account locked" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const token = signToken({ userId: user.id });
    setAuthCookie(res, token);

    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        onboardingStep: user.onboardingStep,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// Firebase login (Phone OTP OR Google) → send firebase idToken
router.post("/firebase", async (req, res) => {
  if (!verifyFirebaseIdToken) {
  return res.status(501).json({ ok: false, error: "Firebase login not enabled" });
}

  try {
    const { idToken, country_code } = req.body || {};
    if (!idToken) return res.status(400).json({ ok: false, error: "idToken required" });

    const decoded = await verifyFirebaseIdToken(idToken);

    const firebaseUid = decoded.uid;
    const email = decoded.email || null;
    const phone = decoded.phone_number || null;
    const name = decoded.name || null;

    // determine provider type
    const provider = phone ? "firebase_phone" : "firebase_google";

    let user = null;
    if (email) {
      user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    }
    if (!user && phone) {
      user = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
    }
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          phone,
          countryCode: country_code || null,
          name,
        },
        select: { id: true },
      });
    }
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isLocked: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });
    if (fullUser.isLocked) {
      return res.status(403).json({ ok: false, error: "Account locked" });
    }

    const token = signToken({ userId: user.id });
    setAuthCookie(res, token);

    return res.json({
      ok: true,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        phone: fullUser.phone,
        role: fullUser.role,
        onboardingStep: fullUser.onboardingStep,
        onboardingCompleted: fullUser.onboardingCompleted,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
});

router.post("/logout", async (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// Check if a username is available.
// GET /api/auth/username-check?username=johndoe
router.get("/username-check", async (req, res) => {
  try {
    const { username } = req.query || {};
    if (!username) {
      return res.status(400).json({ ok: false, error: "Username is required" });
    }
    const trimmed = String(username).trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { username: trimmed },
      select: { id: true },
    });
    const available = !existing;
    return res.json({ ok: true, available });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
