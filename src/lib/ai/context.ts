export interface LocationContext {
  userLatitude?: number;
  userLongitude?: number;
  activeBranch: string;
  branchAddress: string;
  branchCoordinates: { lat: number; lng: number };
}

// Función para inyectar contexto geolocalizado preciso al prompt de la IA
export function buildGeoContextPrompt(context: LocationContext): string {
  return `
[CONTEXTO GEOLOCALIZADO DE LA SESIÓN]
- Sucursal Activa de la Dra. Aura: ${context.activeBranch}
- Dirección Oficial: ${context.branchAddress}
- Ubicación detectada del Paciente: ${context.userLatitude && context.userLongitude ? `Lat: ${context.userLatitude}, Lng:${context.userLongitude}` : 'No compartida explícitamente, asumir cercanía a la sucursal activa'}

REGLA DE ORO DE UBICACIÓN:
Nunca respondas direcciones genéricas o inventadas. Si el usuario pregunta dónde se ubican o qué tan lejos están, responde estrictamente utilizando la información de la sucursal activa actual: "${context.activeBranch}" ubicada en "${context.branchAddress}".
`;
}
