import { create } from "zustand";
import { DEFAULT_TWIN_PARAMS } from "@/components/DigitalTwin/simulations";
import type { CameraPresetId } from "@/components/DigitalTwin/scene/CameraPresets";
import { adaptApiScenario, ApiSimulationScenario } from "@/lib/digitalTwin/scenarioAdapter";

export type TwinMode = "REAL" | "SIMULATION";
export type PlaybackSpeed = 1 | 10 | 30;
export type SimulationType =
  | "WATER_LEVEL_RISE"
  | "HEAVY_RAIN"
  | "DIKE_SATURATION"
  | "SAFETY_FACTOR"
  | "SEEPAGE_DETECTION"
  | "OVERFLOW_DEMO";

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
  showSensorLabels: boolean;
  cameraPreset: CameraPresetId | null;
  cameraPresetNonce: number;
  stopSignal: number;
  loadedScenarioName: string | null;
  setMode: (mode: TwinMode) => void;
  setSimulationType: (simulationType: SimulationType) => void;
  setCombinedMode: (enabled: boolean) => void;
  toggleCombinedScenario: (simulationType: SimulationType) => void;
  setParam: (key: string, value: number | string) => void;
  setParams: (params: Record<string, number | string>) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setShowIsolines: (enabled: boolean) => void;
  setShowSaturationMap: (enabled: boolean) => void;
  setShowFlowVector: (enabled: boolean) => void;
  setShowSensorLabels: (enabled: boolean) => void;
  focusCamera: (preset: CameraPresetId) => void;
  loadApiScenario: (scenario: ApiSimulationScenario, autoRun?: boolean) => void;
  run: () => void;
  pause: () => void;
  stop: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  mode: "REAL",
  simulationType: "WATER_LEVEL_RISE",
  combinedMode: false,
  combinedScenarios: [],
  params: { ...DEFAULT_TWIN_PARAMS },
  running: false,
  playbackSpeed: 1,
  showIsolines: false,
  showSaturationMap: true,
  showFlowVector: true,
  showSensorLabels: true,
  cameraPreset: null,
  cameraPresetNonce: 0,
  stopSignal: 0,
  loadedScenarioName: null,
  setMode: (mode) => set({ mode }),
  setSimulationType: (simulationType) => set({ simulationType, loadedScenarioName: null }),
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
  setParams: (params) => set({ params: { ...DEFAULT_TWIN_PARAMS, ...params } }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setShowIsolines: (showIsolines) => set({ showIsolines }),
  setShowSaturationMap: (showSaturationMap) => set({ showSaturationMap }),
  setShowFlowVector: (showFlowVector) => set({ showFlowVector }),
  setShowSensorLabels: (showSensorLabels) => set({ showSensorLabels }),
  focusCamera: (cameraPreset) =>
    set((state) => ({
      cameraPreset,
      cameraPresetNonce: state.cameraPresetNonce + 1,
    })),
  loadApiScenario: (scenario, autoRun = true) => {
    const adapted = adaptApiScenario(scenario);
    set({
      mode: "SIMULATION",
      simulationType: adapted.simulationType,
      params: { ...DEFAULT_TWIN_PARAMS, ...adapted.params },
      loadedScenarioName: adapted.name,
      running: autoRun,
      combinedMode: false,
      combinedScenarios: [],
    });
  },
  run: () => {
    if (get().mode !== "SIMULATION") {
      return;
    }
    set({ running: true });
  },
  pause: () => set({ running: false }),
  stop: () => set((state) => ({ running: false, stopSignal: state.stopSignal + 1, loadedScenarioName: null })),
}));
