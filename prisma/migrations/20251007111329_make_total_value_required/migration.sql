/*
  Warnings:

  - Made the column `totalValue` on table `appointments` required. This step will fail if there are existing NULL values in that column.

*/
-- Atualizar valores NULL com o preço do serviço associado
UPDATE appointments 
SET totalValue = (SELECT price FROM services WHERE services.id = appointments.serviceId)
WHERE totalValue IS NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "paymentMethod" TEXT,
    "totalValue" REAL NOT NULL,
    "rescheduledFromId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "appointments_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "appointments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "appointments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_appointments" ("clientId", "companyId", "createdAt", "date", "endTime", "id", "notes", "paymentMethod", "rescheduledFromId", "serviceId", "startTime", "status", "totalValue", "updatedAt") SELECT "clientId", "companyId", "createdAt", "date", "endTime", "id", "notes", "paymentMethod", "rescheduledFromId", "serviceId", "startTime", "status", "totalValue", "updatedAt" FROM "appointments";
DROP TABLE "appointments";
ALTER TABLE "new_appointments" RENAME TO "appointments";
CREATE INDEX "appointments_companyId_idx" ON "appointments"("companyId");
CREATE INDEX "appointments_date_idx" ON "appointments"("date");
CREATE INDEX "appointments_status_idx" ON "appointments"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
