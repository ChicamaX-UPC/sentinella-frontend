import { create } from "zustand";

export type TwinMode = "REAL" | "SIMULATION";
export type PlaybackSpeed = 1 | 10 | 30;
export type SimulationType = "WATER_LEVEL_RISE" | "HEAVY_RAIN" | "DIKE_SATURATION" | "SAFETY_FACTOR" | "SEEPAGE_DETECTION";

interface SimulationState {
  mode: TwinMode;
  simulationType: SimulationType;
  combinedMode: boolean;
  combinedScenarios: SimulationType[];
  params: Record<string, number | string>;
  running: boolean;
  playbackSpeed: PlaybackSpeed;
  showIsolines: boolean;
  showSaturationMap: boolean;
  showFlowVector: boolean;
  stopSignal: number;
  setMode: (mode: TwinMode) => void;
  setSimulationType: (simulationType: SimulationType) => void;
  setCombinedMode: (enabled: boolean) => void;
  toggleCombinedScenario: (simulationType: SimulationType) => void;
  setParam: (key: string, value: number | string) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setShowIsolines: (enabled: boolean) => void;
  setShowSaturationMap: (enabled: boolean) => void;
  setShowFlowVector: (enabled: boolean) => void;
  run: () => void;
  pause: () => void;
  stop: () => void;
}

const DEFAULT_PARAMS: Record<string, number | string> = {
  fillRate: 60,
  rainIntensity: 20,
  relaveLevel: 780,
  seismic: 0,
  seepageFlow: 0,
  seepageLocation: "Base Central (PI-03)",
};

export const useSimulationStore = create<SimulationState>((set) => ({
  mode: "REAL",
  simulationType: "WATER_LEVEL_RISE",
  combinedMode: false,
  combinedScenarios: [],
  params: DEFAULT_PARAMS,
  running: false,
  playbackSpeed: 1,
  showIsolines: false,
  showSaturationMap: true,
  showFlowVector: true,
  stopSignal: 0,
  setMode: (mode) => set({ mode }),
  setSimulationType: (simulationType) => set({ simulationType }),
  setCombinedMode: (combinedMode) => set({ combinedMode }),
  toggleCombinedScenario: (simulationType) =>
    set((state) => {
      const exists = state.combinedScenarios.includes(simulationType);
      return {
        combinedScenarios: exists
          ? state.combinedScenarios.filter((scenario) => scenario !== simulationType)
          : [...state.combinedScenarios, simulationType],
      };
    }),
  setParam: (key, value) => set((s) => ({ params: { ...s.params, [key]: value } })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setShowIsolines: (showIsolines) => set({ showIsolines }),
  setShowSaturationMap: (showSaturationMap) => set({ showSaturationMap }),
  setShowFlowVector: (showFlowVector) => set({ showFlowVector }),
  run: () => set({ running: true }),
  pause: () => set({ running: false }),
  stop: () => set((state) => ({ running: false, stopSignal: state.stopSignal + 1 })),
}));
