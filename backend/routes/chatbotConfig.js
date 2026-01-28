const express = require("express");
const router = express.Router();

/**
 * NOTE:
 * - ZIP-aligned (routes/*.js)
 * - In-memory for now (safe)
 * - API contract stable (later DB swap, same endpoints)
 */

// default config
let chatbotConfig = {
  title: "PromoHub Assistant",
  subtitle: "Helping creators & brands grow 🚀",
  welcomeMessage:
    "Hi 👋 I’m your PromoHub assistant. I can help you complete onboarding, manage packages, and explore features.",
  actions: [
    {
      id: "onboarding",
      label: "⚠️ Complete onboarding",
      type: "REQUIRE_LOGIN",
      redirectAfterLogin: "/onboarding",
    },
    {
      id: "package",
      label: "📦 Create / modify package",
      type: "REQUIRE_LOGIN",
      redirectAfterLogin: "/creator/packages",
    },
    {
      id: "articles",
      label: "📄 Read articles",
      type: "REDIRECT",
      url: "/articles",
    },
  ],
  updatedAt: new Date(),
};

/**
 * GET — Public (used by chatbot UI)
 */
router.get("/", (_req, res) => {
  res.json(chatbotConfig);
});

/**
 * PUT — Admin update
 * IMPORTANT:
 * - Auth middleware later (reuse existing admin auth when ready)
 * - For now: safe, non-breaking
 */
router.put("/", (req, res) => {
  chatbotConfig = {
    ...chatbotConfig,
    ...req.body,
    updatedAt: new Date(),
  };
  res.json({ success: true });
});

module.exports = router;
