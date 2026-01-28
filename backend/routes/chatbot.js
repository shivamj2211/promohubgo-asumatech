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


module.exports = router;

