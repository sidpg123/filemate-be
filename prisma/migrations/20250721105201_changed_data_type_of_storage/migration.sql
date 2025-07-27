/*
  Warnings:

  - You are about to alter the column `storageUsed` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `allocatedStorage` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "storageUsed" SET DEFAULT 0,
ALTER COLUMN "storageUsed" SET DATA TYPE BIGINT,
ALTER COLUMN "allocatedStorage" SET DEFAULT 1073741824,
ALTER COLUMN "allocatedStorage" SET DATA TYPE BIGINT;
