const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/complete", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });
    const finalStep = user?.role === "BRAND" ? 8 : 5;
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        onboardingCompleted: true,
        onboardingStep: finalStep,
      },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/onboarding/complete ERROR:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
