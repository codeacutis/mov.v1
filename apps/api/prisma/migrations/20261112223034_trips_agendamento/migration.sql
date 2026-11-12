CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MOTORISTA');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'IN_MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'INTERRUPTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "OutboundStatus" AS ENUM ('PLANNED', 'BOARDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('EXPECTED', 'RETURNED', 'NOT_RETURNING', 'NO_SHOW');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "plate" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "phone" TEXT,
    "cpf" TEXT,
    "susCardNumber" TEXT,
    "address" TEXT,
    "usesWheelchair" BOOLEAN NOT NULL DEFAULT false,
    "hasReducedMobility" BOOLEAN NOT NULL DEFAULT false,
    "needsBoardingAssistance" BOOLEAN NOT NULL DEFAULT false,
    "operationalNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "municipalPickupPoint" TEXT NOT NULL,
    "plannedDepartureAt" TIMESTAMPTZ(3) NOT NULL,
    "plannedReturnStartAt" TIMESTAMPTZ(3) NOT NULL,
    "plannedReturnEndAt" TIMESTAMPTZ(3) NOT NULL,
    "actualDepartureAt" TIMESTAMPTZ(3),
    "actualReturnAt" TIMESTAMPTZ(3),
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledByUserId" UUID,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_trips" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "appointmentLocationName" TEXT NOT NULL,
    "appointmentAddress" TEXT NOT NULL,
    "appointmentMunicipality" TEXT NOT NULL,
    "appointmentAt" TIMESTAMPTZ(3) NOT NULL,
    "priority" "Priority" NOT NULL,
    "priorityJustification" TEXT,
    "priorityDefinedByUserId" UUID NOT NULL,
    "priorityDefinedAt" TIMESTAMPTZ(3) NOT NULL,
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "outboundStatus" "OutboundStatus" NOT NULL DEFAULT 'PLANNED',
    "returnStatus" "ReturnStatus" NOT NULL DEFAULT 'EXPECTED',
    "returnAbsenceReason" TEXT,
    "returnAbsenceReportedAt" TIMESTAMPTZ(3),
    "returnAbsenceReportedBy" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "patient_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "changes" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "patients_cpf_key" ON "patients"("cpf");

-- CreateIndex
CREATE INDEX "trips_driverId_plannedDepartureAt_idx" ON "trips"("driverId", "plannedDepartureAt");

-- CreateIndex
CREATE INDEX "trips_vehicleId_plannedDepartureAt_idx" ON "trips"("vehicleId", "plannedDepartureAt");

-- CreateIndex
CREATE INDEX "trips_status_plannedDepartureAt_idx" ON "trips"("status", "plannedDepartureAt");

-- CreateIndex
CREATE INDEX "patient_trips_patientId_idx" ON "patient_trips"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_trips_tripId_patientId_key" ON "patient_trips"("tripId", "patientId");

-- CreateIndex
CREATE INDEX "trip_companions_patientTripId_idx" ON "trip_companions"("patientTripId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_trips" ADD CONSTRAINT "patient_trips_priorityDefinedByUserId_fkey" FOREIGN KEY ("priorityDefinedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_companions" ADD CONSTRAINT "trip_companions_patientTripId_fkey" FOREIGN KEY ("patientTripId") REFERENCES "patient_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Regras de integridade de agenda (RNF-04, RN-18, D-021)
-- ---------------------------------------------------------------------------

-- Ordem dos horários planejados da operação.
ALTER TABLE "trips" ADD CONSTRAINT "trips_planned_times_order_chk"
  CHECK ("plannedDepartureAt" < "plannedReturnStartAt"
     AND "plannedReturnStartAt" < "plannedReturnEndAt");

-- Mesmo motorista não pode ter duas viagens ativas com intervalos sobrepostos,
-- inclusive sob requisições concorrentes. Viagens canceladas, concluídas ou
-- interrompidas não bloqueiam a agenda.
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_no_overlap_excl"
  EXCLUDE USING gist (
    "driverId" WITH =,
    tstzrange("plannedDepartureAt", "plannedReturnEndAt", '[)') WITH &&
  ) WHERE ("status" IN ('SCHEDULED', 'IN_PROGRESS'));

-- Idem para o veículo.
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_no_overlap_excl"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("plannedDepartureAt", "plannedReturnEndAt", '[)') WITH &&
  ) WHERE ("status" IN ('SCHEDULED', 'IN_PROGRESS'));

-- Capacidade positiva.
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_capacity_positive_chk"
  CHECK ("capacity" > 0);

-- Cancelamento exige motivo e instante.
ALTER TABLE "trips" ADD CONSTRAINT "trips_cancellation_chk"
  CHECK ("status" <> 'CANCELLED'
     OR ("cancellationReason" IS NOT NULL AND "cancelledAt" IS NOT NULL));
