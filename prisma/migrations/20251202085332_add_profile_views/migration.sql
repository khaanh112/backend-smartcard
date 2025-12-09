-- CreateEnum
CREATE TYPE "ViewSource" AS ENUM ('DIRECT', 'QR_SCAN', 'SOCIAL_MEDIA', 'EMAIL', 'OTHER');

-- CreateTable
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "source" "ViewSource" NOT NULL DEFAULT 'DIRECT',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_views_profileId_idx" ON "profile_views"("profileId");

-- CreateIndex
CREATE INDEX "profile_views_timestamp_idx" ON "profile_views"("timestamp");

-- CreateIndex
CREATE INDEX "profile_views_source_idx" ON "profile_views"("source");

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
