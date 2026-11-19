-- D-017: NOT_RETURNING sempre possui a comunicação que justificou a ausência.
-- Nos demais estados, esses metadados devem permanecer vazios.
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_return_absence_consistency" CHECK (
  (
    "returnStatus" = 'NOT_RETURNING'
    AND NULLIF(BTRIM("returnAbsenceReason"), '') IS NOT NULL
    AND "returnAbsenceReportedAt" IS NOT NULL
    AND "returnAbsenceReportedByUserId" IS NOT NULL
  ) OR (
    "returnStatus" <> 'NOT_RETURNING'
    AND "returnAbsenceReason" IS NULL
    AND "returnAbsenceReportedAt" IS NULL
    AND "returnAbsenceReportedByUserId" IS NULL
  )
);
