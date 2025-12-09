-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_themeId_fkey";

-- DropTable
DROP TABLE IF EXISTS "payments";
DROP TABLE IF EXISTS "themes";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "themeId";