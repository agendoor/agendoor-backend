-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_whatsapp_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT,
    "appointmentId" TEXT,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "messageSid" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "cost" REAL,
    "status" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_logs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_whatsapp_logs" ("clientId", "companyId", "cost", "createdAt", "direction", "id", "message", "messageSid", "paid", "phone", "status") SELECT "clientId", "companyId", "cost", "createdAt", "direction", "id", "message", "messageSid", "paid", "phone", "status" FROM "whatsapp_logs";
DROP TABLE "whatsapp_logs";
ALTER TABLE "new_whatsapp_logs" RENAME TO "whatsapp_logs";
CREATE INDEX "whatsapp_logs_companyId_idx" ON "whatsapp_logs"("companyId");
CREATE INDEX "whatsapp_logs_clientId_idx" ON "whatsapp_logs"("clientId");
CREATE INDEX "whatsapp_logs_appointmentId_idx" ON "whatsapp_logs"("appointmentId");
CREATE INDEX "whatsapp_logs_phone_idx" ON "whatsapp_logs"("phone");
CREATE INDEX "whatsapp_logs_createdAt_idx" ON "whatsapp_logs"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
