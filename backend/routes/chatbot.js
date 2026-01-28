const express = require("express");
const router = express.Router();

/**
 * GET /api/chatbot/ping
 * just to verify backend is working
 */
router.get("/ping", (_req, res) => {
  res.json({ message: "chatbot route working" });
});
router.get("/config", (_req, res) => {
  res.json({
    actions: [
      {
        id: "article",
        label: "📄 Read articles",
        type: "REDIRECT",
        url: "/articles"
      },
      {
        id: "demo",
        label: "📅 Request a demo",
        type: "REDIRECT",
        url: "/demo"
      },
      {
        id: "onboarding",
        label: "⚠️ Complete onboarding",
        type: "REQUIRE_LOGIN",
        redirectAfterLogin: "/onboarding"
      },
      {
        id: "package",
        label: "📦 Create / modify package",
        type: "REQUIRE_LOGIN",
        redirectAfterLogin: "/creator/packages"
      }
    ]
  });
});
router.post("/message", (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({
      reply: "Please type something so I can help 😊",
    });
  }

  const text = message.toLowerCase();

  // --- Simple intent detection (rule-based AI) ---
  if (text.includes("onboarding")) {
    return res.json({
      reply:
        "To start using PromoHub fully, please complete your onboarding. I’ll guide you step by step once you’re logged in.",
      action: {
        type: "REQUIRE_LOGIN",
        redirectAfterLogin: "/onboarding",
      },
    });
  }

  if (text.includes("package")) {
    return res.json({
      reply:
        "Creators can create packages to showcase their services. You can set pricing, deliverables, and visibility.",
      action: {
        type: "REQUIRE_LOGIN",
        redirectAfterLogin: "/creator/packages",
      },
    });
  }

  if (text.includes("brand")) {
    return res.json({
      reply:
        "Brands can explore creators, compare packages, and place orders directly through PromoHub.",
    });
  }

  if (text.includes("creator")) {
    return res.json({
      reply:
        "Creators on PromoHub can list services, manage packages, receive orders, and track earnings.",
    });
  }

  if (text.includes("help") || text.includes("start")) {
    return res.json({
      reply:
        "I can help you with onboarding, packages, creators, brands, and general platform guidance. Just ask!",
    });
  }

  // --- fallback ---
  return res.json({
    reply:
      "I’m still learning 🤖. You can ask me about onboarding, packages, creators, or brands.",
  });
});


module.exports = router;

