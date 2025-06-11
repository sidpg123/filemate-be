/*
  Warnings:

  - You are about to drop the column `aadhar_no` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `pan_no` on the `Client` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Client_aadhar_no_key";

-- DropIndex
DROP INDEX "Client_pan_no_key";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "aadhar_no",
DROP COLUMN "pan_no";
