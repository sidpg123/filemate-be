/*
  Warnings:

  - You are about to alter the column `storage_used` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "storage_used" SET DEFAULT 0,
ALTER COLUMN "storage_used" SET DATA TYPE BIGINT;
