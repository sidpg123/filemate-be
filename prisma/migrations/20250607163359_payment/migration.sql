/*
  Warnings:

  - You are about to drop the column `razorpayId` on the `Subscription` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Subscription_razorpayId_key";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "razorpayId",
ADD COLUMN     "raorpay_signature" TEXT,
ADD COLUMN     "razorpay_order_id" TEXT,
ADD COLUMN     "razorpay_payment_id" TEXT;
