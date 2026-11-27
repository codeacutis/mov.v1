export function vehicleLabel(vehicle: { description?: string | null; plate: string } | null | undefined) {
  return vehicle?.description?.trim() || vehicle?.plate || 'Veículo não informado';
}
