ALTER TABLE "trips" ADD COLUMN "actualReturnStartAt" TIMESTAMPTZ(3);
CREATE TYPE "TripObservationType" AS ENUM ('INCIDENT', 'CONTACT_ATTEMPT');
ALTER TABLE "trip_observations"
  ADD COLUMN "type" "TripObservationType" NOT NULL DEFAULT 'INCIDENT',
  ADD COLUMN "patientTripId" UUID;
ALTER TABLE "trip_observations" ADD CONSTRAINT "trip_observations_patientTripId_fkey"
  FOREIGN KEY ("patientTripId") REFERENCES "patient_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
