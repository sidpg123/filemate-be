/*
  Warnings:

  - A unique constraint covering the columns `[createdAt,id]` on the table `PendingFees` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PendingFees_createdAt_id_key" ON "PendingFees"("createdAt", "id");
