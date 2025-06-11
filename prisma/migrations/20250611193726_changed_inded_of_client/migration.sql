-- DropIndex
DROP INDEX "Client_ca_id_idx";

-- CreateIndex
CREATE INDEX "Client_id_createdAt_idx" ON "Client"("id", "createdAt");
