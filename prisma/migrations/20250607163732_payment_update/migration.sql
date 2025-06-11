/*
  Warnings:

  - You are about to drop the column `raorpay_signature` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "raorpay_signature",
ADD COLUMN     "razorpay_signature" TEXT;
