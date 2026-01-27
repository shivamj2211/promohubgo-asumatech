-- CreateTable
CREATE TABLE IF NOT EXISTS "InfluencerPackage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InfluencerPackageAnalytics" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerPackageAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InfluencerPackageEvent" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerPackageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InfluencerPackage_userId_idx" ON "InfluencerPackage"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InfluencerPackage_platform_idx" ON "InfluencerPackage"("platform");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InfluencerPackageAnalytics_packageId_key" ON "InfluencerPackageAnalytics"("packageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InfluencerPackageEvent_packageId_idx" ON "InfluencerPackageEvent"("packageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InfluencerPackageEvent_eventType_idx" ON "InfluencerPackageEvent"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InfluencerPackageEvent_userId_idx" ON "InfluencerPackageEvent"("userId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InfluencerPackage_userId_fkey'
  ) THEN
    ALTER TABLE "InfluencerPackage"
    ADD CONSTRAINT "InfluencerPackage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InfluencerPackageAnalytics_packageId_fkey'
  ) THEN
    ALTER TABLE "InfluencerPackageAnalytics"
    ADD CONSTRAINT "InfluencerPackageAnalytics_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "InfluencerPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InfluencerPackageEvent_packageId_fkey'
  ) THEN
    ALTER TABLE "InfluencerPackageEvent"
    ADD CONSTRAINT "InfluencerPackageEvent_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "InfluencerPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InfluencerPackageEvent_userId_fkey'
  ) THEN
    ALTER TABLE "InfluencerPackageEvent"
    ADD CONSTRAINT "InfluencerPackageEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

