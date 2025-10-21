/*
  Warnings:

  - Made the column `email` on table `clients` required. This step will fail if there are existing NULL values in that column.

*/
-- Update existing NULL emails with placeholder values before migration
UPDATE "clients" SET email = 'placeholder_' || id || '@agendoor.local' WHERE email IS NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "birthDate" DATETIME,
    "notes" TEXT,
    "flowStep" TEXT,
    "cep" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_clients" ("birthDate", "cep", "city", "companyId", "complement", "cpf", "createdAt", "email", "flowStep", "fullName", "id", "neighborhood", "notes", "number", "phone", "state", "street", "updatedAt") SELECT "birthDate", "cep", "city", "companyId", "complement", "cpf", "createdAt", "email", "flowStep", "fullName", "id", "neighborhood", "notes", "number", "phone", "state", "street", "updatedAt" FROM "clients";
DROP TABLE "clients";
ALTER TABLE "new_clients" RENAME TO "clients";
CREATE INDEX "clients_companyId_idx" ON "clients"("companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
