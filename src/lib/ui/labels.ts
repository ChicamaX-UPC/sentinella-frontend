import type { Role } from "@/types/session";

/** Etiquetas en español para códigos de rol del API. */
export const ROLE_LABEL_ES: Record<Role, string> = {
  SYSTEM_ADMIN: "Administrador del sistema",
  PLANT_MANAGER: "Jefe de planta",
  FIELD_OPERATOR: "Operador de campo",
  READ_ONLY: "Solo lectura",
};

export function labelRole(role: string | undefined): string {
  if (!role) return "—";
  return ROLE_LABEL_ES[role as Role] ?? role;
}

/** Tipos de sensor alineados con el dominio backend (`SensorType`). */
export const SENSOR_TYPES = [
  "WATER_LEVEL",
  "PRESSURE",
  "INCLINATION",
  "PH",
  "TURBIDITY",
  "PLUVIOMETER",
] as const;

export type SensorTypeCode = (typeof SENSOR_TYPES)[number];

const SENSOR_TYPE_LABEL_ES: Record<SensorTypeCode, string> = {
  WATER_LEVEL: "Nivel de agua",
  PRESSURE: "Presión",
  INCLINATION: "Inclinación",
  PH: "pH",
  TURBIDITY: "Turbidez",
  PLUVIOMETER: "Pluviómetro",
};

export function labelSensorType(code: string | undefined): string {
  if (!code) return "—";
  return (SENSOR_TYPE_LABEL_ES as Record<string, string>)[code] ?? code;
}

export const OPERATORS_NUMERIC = ["GT", "LT", "GTE", "LTE"] as const;
export type NumericOperator = (typeof OPERATORS_NUMERIC)[number];

const OPERATOR_LABEL_ES: Record<NumericOperator, string> = {
  GT: "Mayor que",
  LT: "Menor que",
  GTE: "Mayor o igual",
  LTE: "Menor o igual",
};

export function labelNumericOperator(code: string | undefined): string {
  if (!code) return "—";
  return OPERATOR_LABEL_ES[code as NumericOperator] ?? code;
}

export const ALERT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export type AlertSeverityCode = (typeof ALERT_SEVERITIES)[number];

const SEVERITY_LABEL_ES: Record<AlertSeverityCode, string> = {
  INFO: "Informativa",
  WARNING: "Advertencia",
  CRITICAL: "Crítica",
};

/** Severidad mostrada en UI (acepta variantes del API). */
export function labelAlertSeverity(code: string | undefined): string {
  if (!code) return "—";
  const u = code.toUpperCase();
  if (u.includes("CRIT")) return SEVERITY_LABEL_ES.CRITICAL;
  if (u.includes("WARN")) return SEVERITY_LABEL_ES.WARNING;
  if (u.includes("INFO")) return SEVERITY_LABEL_ES.INFO;
  return SEVERITY_LABEL_ES[u as AlertSeverityCode] ?? code;
}

export const NOTIFY_CHANNELS = ["APP", "SMS", "EMAIL"] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];

const CHANNEL_LABEL_ES: Record<NotifyChannel, string> = {
  APP: "Aplicación",
  SMS: "SMS",
  EMAIL: "Correo electrónico",
};

export function labelNotifyChannel(code: string | undefined): string {
  if (!code) return "—";
  return CHANNEL_LABEL_ES[code as NotifyChannel] ?? code;
}

export function labelAlertStatus(st: string | undefined): string {
  if (!st) return "—";
  const u = st.toUpperCase();
  if (u.includes("RECEIVED") || u.includes("ACTIVE") || u.includes("OPEN")) return "Recibida";
  if (u.includes("ACK")) return "Reconocida";
  if (u.includes("RESOLV")) return "Resuelta";
  if (u.includes("CLOSE") || u.includes("CERRAD")) return "Cerrada";
  return st;
}

export const SIMULATION_TYPES = [
  "WATER_LEVEL_RISE",
  "HEAVY_RAIN",
  "DIKE_SATURATION",
  "SAFETY_FACTOR",
  "SEEPAGE_DETECTION",
] as const;

export type SimulationTypeCode = (typeof SIMULATION_TYPES)[number];

const SIMULATION_LABEL_ES: Record<SimulationTypeCode, string> = {
  WATER_LEVEL_RISE: "Subida de nivel de agua",
  HEAVY_RAIN: "Lluvia intensa",
  DIKE_SATURATION: "Saturación del dique",
  SAFETY_FACTOR: "Factor de seguridad",
  SEEPAGE_DETECTION: "Detección de filtraciones",
};

export function labelSimulationType(code: string | undefined): string {
  if (!code) return "—";
  return SIMULATION_LABEL_ES[code as SimulationTypeCode] ?? code;
}

/** Acciones de auditoría frecuentes en alertas. */
export function labelAuditAction(action: string | undefined): string {
  if (!action) return "—";
  const u = action.toUpperCase().replace(/\s/g, "_");
  const map: Record<string, string> = {
    ACKNOWLEDGE: "Reconocimiento",
    ASSIGN: "Asignación",
    COMPLETE: "Completar gestión",
    CLOSE: "Cierre",
    CREATE: "Alta",
    UPDATE: "Actualización",
    DELETE: "Baja",
  };
  return map[u] ?? action;
}

/** Estado de ronda de inspección (valores típicos del API). */
export function labelRoundStatus(s: string | undefined): string {
  if (!s) return "—";
  const u = s.toUpperCase().replace(/-/g, "_");
  const map: Record<string, string> = {
    SCHEDULED: "Programada",
    IN_PROGRESS: "En curso",
    COMPLETED: "Completada",
    CANCELLED: "Cancelada",
  };
  return map[u] ?? s;
}

export function labelReportFormat(fmt: string | undefined): string {
  if (!fmt) return "—";
  const u = fmt.toUpperCase();
  if (u === "PDF") return "PDF";
  if (u === "EXCEL" || u === "XLSX") return "Excel";
  return fmt;
}
