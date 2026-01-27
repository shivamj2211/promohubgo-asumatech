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
const publicProfilesRouter = require("./routes/publicProfiles");
const contactRouter = require("./routes/contact");
const contactRequestsRouter = require("./routes/contactRequests");
const threadsRouter = require("./routes/threads");
const supportRouter = require("./routes/support");
const savedSearchesRouter = require("./routes/savedSearches");
const influencerPackagesRouter = require("./routes/influencerPackages");
const packagesRouter = require("./routes/packages");
const ordersRouter = require("./routes/orders");
const analyticsRouter = require("./routes/analytics");
const cartRouter = require("./routes/cart");
const proposalsRouter = require("./routes/proposals");
const paymentsRouter = require("./routes/payments");
const creatorEarningsRouter = require("./routes/creatorEarnings");
const creatorAnalyticsRouter = require("./routes/creatorAnalytics");
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
app.use("/api/public", publicProfilesRouter);
app.use("/api/contact", contactRouter);
app.use("/api/contact-requests", contactRequestsRouter);
app.use("/api/threads", threadsRouter);
app.use("/api/support", supportRouter);
app.use("/api/saved-searches", savedSearchesRouter);
app.use("/api/influencer-packages", influencerPackagesRouter);
app.use("/api/packages", packagesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/proposals", proposalsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/creator/earnings", creatorEarningsRouter);
app.use("/api/creator/analytics", creatorAnalyticsRouter);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
