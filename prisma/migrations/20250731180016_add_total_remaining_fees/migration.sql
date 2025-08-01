/*
  Warnings:

  - The values [Overdue] on the enum `FeeStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FeeStatus_new" AS ENUM ('Pending', 'Paid');
ALTER TABLE "PendingFees" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PendingFees" ALTER COLUMN "status" TYPE "FeeStatus_new" USING ("status"::text::"FeeStatus_new");
ALTER TYPE "FeeStatus" RENAME TO "FeeStatus_old";
ALTER TYPE "FeeStatus_new" RENAME TO "FeeStatus";
DROP TYPE "FeeStatus_old";
ALTER TABLE "PendingFees" ALTER COLUMN "status" SET DEFAULT 'Pending';
COMMIT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "totalPendingFees" DOUBLE PRECISION NOT NULL DEFAULT 0;
