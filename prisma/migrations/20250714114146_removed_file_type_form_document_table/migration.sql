/*
  Warnings:

  - You are about to drop the column `category` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `fileType` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "category",
DROP COLUMN "fileType";
