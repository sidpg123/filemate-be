-- DropIndex
DROP INDEX "Document_client_id_idx";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "visibleToClient" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PendingFees" ADD COLUMN     "fee_category_id" TEXT;

-- CreateTable
CREATE TABLE "FileCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "FileCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "FeeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileCategory_name_user_id_key" ON "FileCategory"("name", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "FeeCategory_name_user_id_key" ON "FeeCategory"("name", "user_id");

-- CreateIndex
CREATE INDEX "Document_client_id_category_id_idx" ON "Document"("client_id", "category_id");

-- CreateIndex
CREATE INDEX "PendingFees_fee_category_id_idx" ON "PendingFees"("fee_category_id");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FileCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileCategory" ADD CONSTRAINT "FileCategory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingFees" ADD CONSTRAINT "PendingFees_fee_category_id_fkey" FOREIGN KEY ("fee_category_id") REFERENCES "FeeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeCategory" ADD CONSTRAINT "FeeCategory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
