const express = require("express");
const { z } = require("zod");
const { Resend } = require("resend");

const router = express.Router();

const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  role: z.enum(["Brand", "Influencer", "Other"]).optional().default("Other"),
  message: z.string().min(10).max(4000),
  // Honeypot (should stay empty)
  company: z.string().max(0).optional(),
});

/**
 * Simple in-memory rate limiter (per process)
 * NOTE: For multi-instance deployments, swap with Redis.
 */
const hits = new Map();
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const curr = hits.get(key);
  if (!curr || curr.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (curr.count >= limit) return { ok: false, remaining: 0, retryAfterMs: curr.resetAt - now };
  curr.count += 1;
  hits.set(key, curr);
  return { ok: true, remaining: limit - curr.count };
}

// POST /api/support/contact
router.post("/contact", async (req, res) => {
  try {
    const ipRaw = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const ip = String(ipRaw).split(",")[0].trim();

    const rl = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      res.set("Retry-After", String(Math.ceil((rl.retryAfterMs || 0) / 1000)));
      return res.status(429).json({ ok: false, error: "Too many requests. Please try again later." });
    }

    const parsed = ContactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid form data", issues: parsed.error.issues });
    }

    // Honeypot triggered (spam): pretend success
    if (parsed.data.company) {
      return res.status(200).json({ ok: true });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "PromoHubGo <no-reply@promohubgo.com>";
    const to = process.env.SUPPORT_TO_EMAIL || process.env.EMAIL_TO || process.env.ADMIN_EMAIL;

    if (!resendKey) return res.status(500).json({ ok: false, error: "RESEND_API_KEY missing in env" });
    if (!to) {
      return res
        .status(500)
        .json({ ok: false, error: "SUPPORT_TO_EMAIL (or EMAIL_TO/ADMIN_EMAIL) missing in env" });
    }

    const resend = new Resend(resendKey);
    const { name, email, role, message } = parsed.data;

    const subject = `Support: ${role} — ${name}`;
    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Role: ${role}`,
      "",
      "Message:",
      message,
      "",
      `IP: ${ip}`,
    ].join("\n");

    await resend.emails.send({
      from,
      to,
      subject,
      text,
      replyTo: email,
    });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

module.exports = router;
