-- Add portfolio fields to InfluencerProfile
ALTER TABLE "InfluencerProfile"
  ADD COLUMN IF NOT EXISTS "portfolioTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "portfolioLinks" TEXT[] DEFAULT ARRAY[]::TEXT[];
