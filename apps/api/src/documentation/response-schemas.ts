import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

// Schemas de saída separados dos DTOs de entrada: nunca gerar modelos a partir
// das entidades Prisma completas (usuários contêm credenciais internas).
const str: SchemaObject = { type: 'string' };
const uuid: SchemaObject = { type: 'string', format: 'uuid' };
const date: SchemaObject = { type: 'string', format: 'date-time' };
const int: SchemaObject = { type: 'integer' };
const bool: SchemaObject = { type: 'boolean' };
const nullable = (schema: SchemaObject): SchemaObject => ({
  ...schema,
  nullable: true,
});
export const array = (items: SchemaObject): SchemaObject => ({
  type: 'array',
  items,
});
const object = (properties: Record<string, SchemaObject>): SchemaObject => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
});
const enumeration = (...values: string[]): SchemaObject => ({
  type: 'string',
  enum: values,
});
export const ref = (name: string): SchemaObject =>
  ({ $ref: `#/components/schemas/${name}` }) as SchemaObject;
export const page = (name: string): SchemaObject =>
  object({
    data: array(ref(name)),
    total: { ...int, minimum: 0 },
    page: { ...int, minimum: 1 },
    limit: { ...int, minimum: 1, maximum: 100 },
  });
const role = enumeration('ADMIN', 'MOTORISTA');
const status = enumeration(
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'INTERRUPTED',
);
const vehicleStatus = enumeration('ACTIVE', 'IN_MAINTENANCE', 'INACTIVE');
const outbound = enumeration('PLANNED', 'BOARDED', 'NO_SHOW');
const returning = enumeration(
  'EXPECTED',
  'RETURNED',
  'NOT_RETURNING',
  'NO_SHOW',
);
const identity = object({ id: uuid, name: str });
const counts = (field: string) => object({ [field]: int });
const contact = { name: str, phone: nullable(str) };
const accessibility = {
  usesWheelchair: bool,
  hasReducedMobility: bool,
  needsBoardingAssistance: bool,
};
const times = {
  plannedDepartureAt: date,
  plannedReturnStartAt: date,
  actualDepartureAt: nullable(date),
  actualReturnStartAt: nullable(date),
  actualReturnAt: nullable(date),
};
const appointment = {
  appointmentLocationName: nullable(str),
  appointmentAddress: nullable(str),
  appointmentMunicipality: nullable(str),
  appointmentAt: nullable(date),
};
const stop = {
  id: uuid,
  direction: enumeration('OUTBOUND', 'RETURN'),
  sequence: int,
  name: str,
  address: str,
  municipality: str,
  stopType: enumeration('MUNICIPAL_PICKUP', 'APPOINTMENT', 'MUNICIPAL_RETURN'),
  plannedArrivalAt: nullable(date),
};
const driverSummary = {
  id: uuid,
  status,
  municipalPickupPoint: str,
  ...times,
  vehicle: object({ plate: str, description: nullable(str), capacity: int }),
  _count: counts('patientTrips'),
};
const observation = {
  id: uuid,
  type: enumeration('INCIDENT', 'CONTACT_ATTEMPT'),
  description: str,
  patientTripId: nullable(uuid),
  createdAt: date,
};

export const responseSchemas: Record<string, SchemaObject> = {
  ApiError: object({ statusCode: int, message: { oneOf: [str, array(str)] } }),
  SessionIdentity: object({ id: uuid, name: str, role }),
  LoginResponse: object({
    accessToken: {
      ...str,
      description: 'JWT da sessão. Use em Authorize; não compartilhar.',
    },
    expiresAt: date,
  }),
  RecoveryResponse: object({ message: str }),
  User: object({
    id: uuid,
    name: str,
    email: { ...str, format: 'email' },
    role,
    isActive: bool,
    createdAt: date,
  }),
  Driver: object({
    id: uuid,
    isActive: bool,
    licenseNumber: nullable(str),
    licenseCategory: nullable(str),
    licenseExpiresAt: nullable(date),
    hasPassengerTransportCourse: bool,
    notes: nullable(str),
    createdAt: date,
    updatedAt: date,
    user: object({ id: uuid, name: str, email: str, role, isActive: bool }),
  }),
  DriverInconsistencies: object({
    usersWithoutDriver: array(object({ id: uuid, isActive: bool })),
    inconsistentDrivers: array(object({ id: uuid, userId: uuid })),
  }),
  Vehicle: object({
    id: uuid,
    plate: str,
    description: nullable(str),
    capacity: int,
    status: vehicleStatus,
    createdAt: date,
    updatedAt: date,
  }),
  Patient: object({
    id: uuid,
    ...contact,
    birthDate: date,
    susCardNumber: nullable(str),
    address: nullable(str),
    ...accessibility,
    operationalNotes: nullable(str),
    isActive: bool,
    createdAt: date,
    updatedAt: date,
  }),
  Trip: object({
    id: uuid,
    municipalPickupPoint: str,
    ...times,
    status,
    createdAt: date,
    cancellationReason: nullable(str),
    cancelledAt: nullable(date),
    interruptionReason: nullable(str),
    interruptedAt: nullable(date),
    interruptionAction: nullable(str),
    routeApprovedAt: nullable(date),
    vehicle: object({ id: uuid, plate: str, capacity: int }),
    driver: object({ id: uuid, user: identity }),
    _count: counts('patientTrips'),
  }),
  Participation: object({
    id: uuid,
    tripId: uuid,
    patientId: uuid,
    ...appointment,
    priority: enumeration('HIGH', 'MEDIUM', 'LOW'),
    priorityJustification: nullable(str),
    priorityDefinedAt: nullable(date),
    priorityDefinedBy: nullable(identity),
    confirmationStatus: enumeration(
      'PENDING',
      'CONFIRMED',
      'DECLINED',
      'NO_RESPONSE',
    ),
    outboundStatus: outbound,
    returnStatus: returning,
    outboundStopId: nullable(uuid),
    returnStopId: nullable(uuid),
    returnAbsenceReason: nullable(str),
    returnAbsenceReportedAt: nullable(date),
    returnAbsenceReportedBy: nullable(identity),
    cancelledAt: nullable(date),
    cancellationReason: nullable(str),
    cancelledByUserId: nullable(uuid),
    createdAt: date,
    updatedAt: date,
    patient: object({ id: uuid, ...contact }),
    _count: counts('companions'),
  }),
  Companion: object({
    id: uuid,
    patientTripId: uuid,
    name: str,
    phone: str,
    relationship: nullable(str),
    createdAt: date,
  }),
  Stop: object({
    ...stop,
    tripId: uuid,
    notes: nullable(str),
    outboundPatientTrips: array(object({ id: uuid, patient: identity })),
    returnPatientTrips: array(object({ id: uuid, patient: identity })),
  }),
  Observation: object({ ...observation, tripId: uuid, authorId: uuid }),
  ObservationWithAuthor: object({ ...observation, author: identity }),
  DriverTripSummary: object(driverSummary),
  DriverTripDetail: object({
    ...driverSummary,
    routeApprovedAt: nullable(date),
    stops: array(object(stop)),
    patientTrips: array(
      object({
        id: uuid,
        ...appointment,
        outboundStatus: outbound,
        returnStatus: returning,
        outboundStopId: nullable(uuid),
        returnStopId: nullable(uuid),
        patient: object({ ...contact, ...accessibility }),
        companions: array(object(contact)),
      }),
    ),
  }),
  AuditEntry: object({
    id: uuid,
    actorUserId: nullable(uuid),
    actor: nullable(object({ name: str })),
    action: str,
    entityType: str,
    entityId: nullable(str),
    occurredAt: date,
    reason: nullable(str),
    changes: {
      nullable: true,
      description: 'Mudanças minimizadas; estrutura depende da ação.',
      oneOf: [
        { type: 'object', additionalProperties: true },
        array({}),
        str,
        { type: 'number' },
        bool,
      ],
    },
  }),
  TripReport: object({
    id: uuid,
    status,
    ...times,
    plate: str,
    driver: str,
    capacity: int,
    patients: int,
    companions: int,
    occupancy: nullable({
      type: 'number',
      description: 'Ocupação planejada em porcentagem.',
    }),
    municipalities: array(str),
  }),
  Dashboard: object({
    total: int,
    scheduled: int,
    inProgress: int,
    completed: int,
    cancelled: int,
    activeVehicles: int,
    totalVehicles: int,
    plannedSeats: int,
    capacity: int,
    boardedPatients: int,
    occupancy: nullable({ type: 'number' }),
    municipalities: array(object({ name: str, total: int })),
    months: array(object({ month: str, total: int })),
    vehicles: array(
      object({ plate: str, viagens: int, lugares: int, capacidade: int }),
    ),
  }),
  Agenda: object({
    trips: array(
      object({
        id: uuid,
        plannedDepartureAt: date,
        plannedReturnStartAt: date,
        municipalPickupPoint: str,
        status,
        vehicle: object({ id: uuid, plate: str }),
        driver: object({ user: object({ name: str }) }),
        _count: counts('patientTrips'),
      }),
    ),
    vehicles: array(object({ id: uuid, plate: str, status: vehicleStatus })),
  }),
};
