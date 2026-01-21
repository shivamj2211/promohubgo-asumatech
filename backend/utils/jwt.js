const jwt = require("jsonwebtoken");

const COOKIE_NAME = process.env.COOKIE_NAME || "promohub_token";

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function setAuthCookie(res, token) {
  // HttpOnly cookie (best for web)
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true in production https
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", secure: false });
}

module.exports = { signToken, setAuthCookie, clearAuthCookie, COOKIE_NAME };
