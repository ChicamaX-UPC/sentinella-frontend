export type Role = "SYSTEM_ADMIN" | "PLANT_MANAGER" | "FIELD_OPERATOR" | "READ_ONLY";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  tailingDamIds: string[];
  active: boolean;
  permissions: string[];
  jobTitle?: string | null;
  phone?: string | null;
}
