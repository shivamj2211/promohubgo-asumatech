-- CreateTable
CREATE TABLE "InfluencerPackage" (
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
CREATE TABLE "InfluencerPackageAnalytics" (
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
CREATE TABLE "InfluencerPackageEvent" (
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
CREATE INDEX "InfluencerPackage_userId_idx" ON "InfluencerPackage"("userId");

-- CreateIndex
CREATE INDEX "InfluencerPackage_platform_idx" ON "InfluencerPackage"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerPackageAnalytics_packageId_key" ON "InfluencerPackageAnalytics"("packageId");

-- CreateIndex
CREATE INDEX "InfluencerPackageEvent_packageId_idx" ON "InfluencerPackageEvent"("packageId");

-- CreateIndex
CREATE INDEX "InfluencerPackageEvent_eventType_idx" ON "InfluencerPackageEvent"("eventType");

-- CreateIndex
CREATE INDEX "InfluencerPackageEvent_userId_idx" ON "InfluencerPackageEvent"("userId");

-- AddForeignKey
ALTER TABLE "InfluencerPackage" ADD CONSTRAINT "InfluencerPackage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPackageAnalytics" ADD CONSTRAINT "InfluencerPackageAnalytics_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InfluencerPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPackageEvent" ADD CONSTRAINT "InfluencerPackageEvent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InfluencerPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPackageEvent" ADD CONSTRAINT "InfluencerPackageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

