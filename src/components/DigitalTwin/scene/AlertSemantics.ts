import { FS_CRITICAL, FS_WARNING, MIN_FREEBOARD_M } from "@/components/DigitalTwin/constants";

export type HydraulicAlert = {
  lowFreeboard: boolean;
  activeOverflow: boolean;
  spillSeverity: number;
  spillM: number;
};

export type StructuralAlert = {
  fsCritical: boolean;
  fsWarning: boolean;
  safetyFactor: number;
};

export function computeHydraulicAlert(freeboard: number, spillSeverity: number): HydraulicAlert {
  const spillM = Math.max(0, -freeboard);
  const severity =
    spillSeverity > 0 ? spillSeverity : Math.min(1, Math.max(0, spillM / 1.5));
  return {
    lowFreeboard: freeboard > 0 && freeboard < MIN_FREEBOARD_M,
    activeOverflow: freeboard < -0.02 || severity > 0.03,
    spillSeverity: severity,
    spillM,
  };
}

export function computeStructuralAlert(safetyFactor: number): StructuralAlert {
  return {
    fsCritical: safetyFactor <= FS_CRITICAL,
    fsWarning: safetyFactor <= FS_WARNING && safetyFactor > FS_CRITICAL,
    safetyFactor,
  };
}

/** El riesgo estructural no debe activar capas hidráulicas (agua/beacon). */
export function shouldShowHydraulicLayers(hydraulic: HydraulicAlert): boolean {
  return hydraulic.lowFreeboard || hydraulic.activeOverflow;
}

export function structuralStressOpacity(safetyFactor: number): number {
  return Math.min(0.48, Math.max(0.01, (1.4 - safetyFactor) * 0.28));
}
