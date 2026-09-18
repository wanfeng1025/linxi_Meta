export interface ProfessionalChartAvailability {
  readonly status: 'unavailable';
  readonly adapterVersion: string;
  readonly reason: string;
  readonly missingCapabilities: readonly string[];
  readonly confirmedFields: readonly ['primaryHexagram', 'changedHexagram', 'movingLines'];
}

export interface ProfessionalChartPagePort {
  getAvailability(sessionId: string): ProfessionalChartAvailability;
}
