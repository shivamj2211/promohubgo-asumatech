require("dotenv").config();
const express = require("express");
const cors = require("cors");

const citiesRouter = require("./routes/cities");
const authRouter = require("./routes/auth");
const influncerRouter = require("./routes/influncer");
const brandRouter = require("./routes/brand");
const meRouter = require("./routes/me");
const onboardingRouter = require("./routes/onborading");
const discoveryRouter = require("./routes/discovery");
const valuesRouter = require("./routes/values");
const adminRouter = require("./routes/admin");
const listingsRouter = require("./routes/listings");
const profileRouter = require("./routes/profile");

const app = express();

// Basic cookie parsing middleware (avoids external dependency)
app.use((req, _res, next) => {
  const cookieHeader = req.headers?.cookie;
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      if (!name) return;
      const value = rest.join("=");
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    });
  }
  req.cookies = cookies;
  next();
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/cities", citiesRouter);
app.use("/api/auth", authRouter);
app.use("/api/influencer", influncerRouter);
app.use("/api/brand", brandRouter);
app.use("/api/me", meRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/discovery", discoveryRouter);
app.use("/api/values", valuesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/profile", profileRouter);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
