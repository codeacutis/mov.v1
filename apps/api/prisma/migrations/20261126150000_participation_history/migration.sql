ALTER TABLE "patient_trips" ADD COLUMN "cancelledAt" TIMESTAMPTZ(3), ADD COLUMN "cancellationReason" TEXT, ADD COLUMN "cancelledByUserId" UUID;
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "trip_companions" ADD COLUMN "removedAt" TIMESTAMPTZ(3);
