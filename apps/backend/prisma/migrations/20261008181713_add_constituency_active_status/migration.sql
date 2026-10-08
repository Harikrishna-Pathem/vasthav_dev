-- AlterTable
ALTER TABLE "constituencies" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "otps" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "constituencies_is_active_idx" ON "constituencies"("is_active");
