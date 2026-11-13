ALTER TABLE "drivers"
  ADD COLUMN "licenseNumber"               TEXT,
  ADD COLUMN "licenseCategory"             TEXT,
  ADD COLUMN "licenseExpiresAt"            DATE,
  ADD COLUMN "hasPassengerTransportCourse" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notes"                       TEXT;
