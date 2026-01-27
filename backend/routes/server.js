require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const citiesRouter = require("./routes/cities"); // your pincode lookup already
const authRouter = require("./routes/auth");
const meRouter = require("./routes/me");
const influencerRouter = require("./routes/influencer");
const brandRouter = require("./routes/brand");
const onboardingRouter = require("./routes/onboarding");
const influencerPackagesRouter = require("./routes/influencerPackages");
const ordersRouter = require("./routes/orders");
const app = express();

app.use("/api/influencer-packages", influencerPackages);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use("/api/public", require("./routes/publicProfiles"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/cities", citiesRouter);
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/influencer", influencerRouter);
app.use("/api/brand", brandRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/orders", ordersRouter);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
