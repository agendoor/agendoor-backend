/*
  Warnings:

  - Added the required column `companyId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `service_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `services` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "client_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "client_documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "appointments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_appointments" ("clientId", "createdAt", "date", "endTime", "id", "notes", "serviceId", "startTime", "status", "updatedAt") SELECT "clientId", "createdAt", "date", "endTime", "id", "notes", "serviceId", "startTime", "status", "updatedAt" FROM "appointments";
DROP TABLE "appointments";
ALTER TABLE "new_appointments" RENAME TO "appointments";
CREATE INDEX "appointments_companyId_idx" ON "appointments"("companyId");
CREATE INDEX "appointments_date_idx" ON "appointments"("date");
CREATE TABLE "new_client_tab_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "tabId" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "history" TEXT NOT NULL DEFAULT '[]',
    "lastModifiedBy" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "client_tab_data_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_tab_data_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "business_type_tabs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_client_tab_data" ("clientId", "createdAt", "data", "id", "lastModifiedBy", "notes", "tabId", "updatedAt") SELECT "clientId", "createdAt", "data", "id", "lastModifiedBy", "notes", "tabId", "updatedAt" FROM "client_tab_data";
DROP TABLE "client_tab_data";
ALTER TABLE "new_client_tab_data" RENAME TO "client_tab_data";
CREATE UNIQUE INDEX "client_tab_data_clientId_tabId_key" ON "client_tab_data"("clientId", "tabId");
CREATE TABLE "new_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "birthDate" DATETIME,
    "notes" TEXT,
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
INSERT INTO "new_clients" ("birthDate", "cep", "city", "complement", "cpf", "createdAt", "email", "fullName", "id", "neighborhood", "notes", "number", "phone", "state", "street", "updatedAt") SELECT "birthDate", "cep", "city", "complement", "cpf", "createdAt", "email", "fullName", "id", "neighborhood", "notes", "number", "phone", "state", "street", "updatedAt" FROM "clients";
DROP TABLE "clients";
ALTER TABLE "new_clients" RENAME TO "clients";
CREATE INDEX "clients_companyId_idx" ON "clients"("companyId");
CREATE UNIQUE INDEX "clients_companyId_cpf_key" ON "clients"("companyId", "cpf");
CREATE TABLE "new_service_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "service_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_service_types" ("active", "color", "createdAt", "description", "icon", "id", "name", "sortOrder", "updatedAt") SELECT "active", "color", "createdAt", "description", "icon", "id", "name", "sortOrder", "updatedAt" FROM "service_types";
DROP TABLE "service_types";
ALTER TABLE "new_service_types" RENAME TO "service_types";
CREATE INDEX "service_types_companyId_idx" ON "service_types"("companyId");
CREATE TABLE "new_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mondayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tuesdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wednesdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "thursdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fridayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "saturdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sundayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT NOT NULL DEFAULT '08:00',
    "endTime" TEXT NOT NULL DEFAULT '18:00',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "services_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "services_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_services" ("active", "createdAt", "description", "duration", "endTime", "fridayEnabled", "id", "mondayEnabled", "name", "price", "saturdayEnabled", "serviceTypeId", "startTime", "sundayEnabled", "thursdayEnabled", "tuesdayEnabled", "updatedAt", "wednesdayEnabled") SELECT "active", "createdAt", "description", "duration", "endTime", "fridayEnabled", "id", "mondayEnabled", "name", "price", "saturdayEnabled", "serviceTypeId", "startTime", "sundayEnabled", "thursdayEnabled", "tuesdayEnabled", "updatedAt", "wednesdayEnabled" FROM "services";
DROP TABLE "services";
ALTER TABLE "new_services" RENAME TO "services";
CREATE INDEX "services_companyId_idx" ON "services"("companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "client_documents_clientId_idx" ON "client_documents"("clientId");

-- CreateIndex
CREATE INDEX "client_documents_category_idx" ON "client_documents"("category");
