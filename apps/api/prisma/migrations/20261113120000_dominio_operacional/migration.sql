-- Enums do domínio operacional.
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'IN_MAINTENANCE', 'INACTIVE');
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'INTERRUPTED');
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'NO_RESPONSE');
CREATE TYPE "OutboundStatus" AS ENUM ('PLANNED', 'BOARDED', 'NO_SHOW');
CREATE TYPE "ReturnStatus" AS ENUM ('EXPECTED', 'RETURNED', 'NOT_RETURNING', 'NO_SHOW');
CREATE TYPE "StopDirection" AS ENUM ('OUTBOUND', 'RETURN');
CREATE TYPE "StopType" AS ENUM ('MUNICIPAL_PICKUP', 'APPOINTMENT', 'MUNICIPAL_RETURN');
CREATE TYPE "ConfirmationEventType" AS ENUM ('REQUESTED', 'SENT', 'DELIVERED', 'FAILED', 'RESPONSE', 'RESENT');

CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "plate" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vehicles_capacity_positive" CHECK ("capacity" > 0)
);

CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "phone" TEXT,
    "susCardNumber" TEXT,
    "address" TEXT,
    "usesWheelchair" BOOLEAN NOT NULL DEFAULT false,
    "hasReducedMobility" BOOLEAN NOT NULL DEFAULT false,
    "needsBoardingAssistance" BOOLEAN NOT NULL DEFAULT false,
    "operationalNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "municipalPickupPoint" TEXT NOT NULL,
    "plannedDepartureAt" TIMESTAMPTZ(3) NOT NULL,
    "plannedReturnStartAt" TIMESTAMPTZ(3) NOT NULL,
    "actualDepartureAt" TIMESTAMPTZ(3),
    "actualReturnAt" TIMESTAMPTZ(3),
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledByUserId" UUID,
    "interruptionReason" TEXT,
    "interruptedAt" TIMESTAMPTZ(3),
    "interruptedByUserId" UUID,
    "interruptionAction" TEXT,
    "routeApprovedAt" TIMESTAMPTZ(3),
    "routeApprovedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "trips_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trips_planned_return_after_departure" CHECK ("plannedReturnStartAt" > "plannedDepartureAt")
);

CREATE TABLE "trip_stops" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "direction" "StopDirection" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "stopType" "StopType" NOT NULL,
    "plannedArrivalAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "trip_stops_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_stops_sequence_positive" CHECK ("sequence" > 0),
    CONSTRAINT "trip_stops_latitude_range" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
    CONSTRAINT "trip_stops_longitude_range" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180))
);

CREATE TABLE "patient_trips" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "appointmentLocationName" TEXT,
    "appointmentAddress" TEXT,
    "appointmentMunicipality" TEXT,
    "appointmentAt" TIMESTAMPTZ(3),
    "priority" "Priority" NOT NULL,
    "priorityJustification" TEXT,
    "priorityDefinedByUserId" UUID NOT NULL,
    "priorityDefinedAt" TIMESTAMPTZ(3) NOT NULL,
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "outboundStatus" "OutboundStatus" NOT NULL DEFAULT 'PLANNED',
    "returnStatus" "ReturnStatus" NOT NULL DEFAULT 'EXPECTED',
    "returnAbsenceReason" TEXT,
    "returnAbsenceReportedAt" TIMESTAMPTZ(3),
    "returnAbsenceReportedByUserId" UUID,
    "outboundStopId" UUID,
    "returnStopId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "patient_trips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trip_companions" (
    "id" UUID NOT NULL,
    "patientTripId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "trip_companions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "confirmation_logs" (
    "id" UUID NOT NULL,
    "patientTripId" UUID NOT NULL,
    "eventType" "ConfirmationEventType" NOT NULL,
    "providerMessageId" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "confirmation_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");
CREATE INDEX "trips_driverId_plannedDepartureAt_idx" ON "trips"("driverId", "plannedDepartureAt");
CREATE INDEX "trips_vehicleId_plannedDepartureAt_idx" ON "trips"("vehicleId", "plannedDepartureAt");
CREATE INDEX "trips_status_plannedDepartureAt_idx" ON "trips"("status", "plannedDepartureAt");
CREATE UNIQUE INDEX "trip_stops_tripId_direction_sequence_key" ON "trip_stops"("tripId", "direction", "sequence");
CREATE UNIQUE INDEX "trip_stops_id_tripId_key" ON "trip_stops"("id", "tripId");
CREATE INDEX "trip_stops_tripId_direction_idx" ON "trip_stops"("tripId", "direction");
CREATE UNIQUE INDEX "patient_trips_tripId_patientId_key" ON "patient_trips"("tripId", "patientId");
CREATE INDEX "patient_trips_patientId_idx" ON "patient_trips"("patientId");
CREATE INDEX "patient_trips_tripId_priority_idx" ON "patient_trips"("tripId", "priority");
CREATE INDEX "trip_companions_patientTripId_idx" ON "trip_companions"("patientTripId");
CREATE INDEX "confirmation_logs_patientTripId_occurredAt_idx" ON "confirmation_logs"("patientTripId", "occurredAt");
CREATE INDEX "confirmation_logs_providerMessageId_idx" ON "confirmation_logs"("providerMessageId");

ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_interruptedByUserId_fkey" FOREIGN KEY ("interruptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_routeApprovedByUserId_fkey" FOREIGN KEY ("routeApprovedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_priorityDefinedByUserId_fkey" FOREIGN KEY ("priorityDefinedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_returnAbsenceReportedByUserId_fkey" FOREIGN KEY ("returnAbsenceReportedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_outboundStopId_tripId_fkey" FOREIGN KEY ("outboundStopId", "tripId") REFERENCES "trip_stops"("id", "tripId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_returnStopId_tripId_fkey" FOREIGN KEY ("returnStopId", "tripId") REFERENCES "trip_stops"("id", "tripId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trip_companions" ADD CONSTRAINT "trip_companions_patientTripId_fkey" FOREIGN KEY ("patientTripId") REFERENCES "patient_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "confirmation_logs" ADD CONSTRAINT "confirmation_logs_patientTripId_fkey" FOREIGN KEY ("patientTripId") REFERENCES "patient_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
