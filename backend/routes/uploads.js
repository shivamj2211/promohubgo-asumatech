const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeFolder(input) {
  const cleaned = String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return cleaned || "uploads";
}

function extensionFromMime(mime) {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mime] || "jpg";
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

router.post("/image", requireAuth, async (req, res) => {
  try {
    const { dataUrl, folder } = req.body || {};
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ ok: false, error: "Invalid image data" });
    }
    if (!parsed.mime.startsWith("image/")) {
      return res.status(400).json({ ok: false, error: "Only image uploads are allowed" });
    }

    const buffer = Buffer.from(parsed.base64, "base64");
    if (buffer.length > MAX_FILE_BYTES) {
      return res.status(400).json({ ok: false, error: "Image too large (max 5MB)" });
    }

    const safe = safeFolder(folder);
    const uploadRoot = path.join(__dirname, "..", "uploads", safe);
    ensureDir(uploadRoot);

    const ext = extensionFromMime(parsed.mime);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const filePath = path.join(uploadRoot, name);

    fs.writeFileSync(filePath, buffer);

    const baseUrl =
      process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
    const url = `${baseUrl}/uploads/${safe}/${name}`;

    return res.json({ ok: true, url });
  } catch (e) {
    console.error("POST /api/uploads/image ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
