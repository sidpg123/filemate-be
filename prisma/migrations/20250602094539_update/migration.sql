/*
  Warnings:

  - The `status` column on the `PendingFees` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `subscriptionExpiry` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CA');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('Pending', 'Paid', 'Overdue');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "storage_used" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "PendingFees" DROP COLUMN "status",
ADD COLUMN     "status" "FeeStatus" NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "subscriptionExpiry",
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'CA';

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "razorpayId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_razorpayId_key" ON "Subscription"("razorpayId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
