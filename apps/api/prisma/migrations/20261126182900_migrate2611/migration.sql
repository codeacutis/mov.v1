-- DropForeignKey
ALTER TABLE "patient_trips" DROP CONSTRAINT "patient_trips_cancelledByUserId_fkey";

-- AddForeignKey
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
