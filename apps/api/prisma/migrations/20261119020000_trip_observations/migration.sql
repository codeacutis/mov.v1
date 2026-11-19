CREATE TABLE "trip_observations" (
  "id" UUID NOT NULL,
  "tripId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trip_observations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trip_observations_tripId_createdAt_idx" ON "trip_observations"("tripId", "createdAt");
ALTER TABLE "trip_observations" ADD CONSTRAINT "trip_observations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trip_observations" ADD CONSTRAINT "trip_observations_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
