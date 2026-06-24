import { apiJson, withQuery } from "@/lib/api/http";

export type ForecastPoint = {
  timestamp: string;
  value: number | string;
  projected: boolean;
};

export type NodeForecast = {
  nodeId: string;
  sensorType: string;
  currentValue: number | string;
  slopePerHour: number | string;
  thresholdValue?: number | string | null;
  estimatedThresholdBreachAt?: string | null;
  leadTimeMinutes?: number | null;
  points: ForecastPoint[];
  rainAdjusted: boolean;
};

export type PredictiveRisk = {
  ruleId: string;
  nodeId: string;
  nodeName: string;
  sensorType: string;
  thresholdValue: number | string;
  currentValue: number | string;
  slopePerHour: number | string;
  estimatedBreachAt: string;
  leadTimeMinutes: number;
  severity: string;
};

export function fetchNodeForecast(nodeId: string, horizonHours = 24) {
  return apiJson<NodeForecast>(withQuery(`nodes/${nodeId}/forecast`, { horizonHours }));
}

export function fetchPredictiveRisks() {
  return apiJson<PredictiveRisk[]>("analytics/predictive-risks");
}
