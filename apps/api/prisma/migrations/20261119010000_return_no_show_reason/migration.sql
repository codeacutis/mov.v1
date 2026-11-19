ALTER TABLE "patient_trips"
  DROP CONSTRAINT "patient_trips_return_absence_consistency",
  ADD CONSTRAINT "patient_trips_return_absence_consistency" CHECK (
    (
      "returnStatus" IN ('NOT_RETURNING', 'NO_SHOW')
      AND NULLIF(BTRIM("returnAbsenceReason"), '') IS NOT NULL
      AND "returnAbsenceReportedAt" IS NOT NULL
      AND "returnAbsenceReportedByUserId" IS NOT NULL
    ) OR (
      -- Preserva registros históricos de NO_SHOW sem metadados.
      "returnStatus" <> 'NOT_RETURNING'
      AND "returnAbsenceReason" IS NULL
      AND "returnAbsenceReportedAt" IS NULL
      AND "returnAbsenceReportedByUserId" IS NULL
    )
  );
