// Demand Signal Scoring — pure calculation helpers, deliberately kept
// separate from how a Signal gets created. Nothing here cares whether a
// Signal was typed in by hand or produced later by an automated source;
// it only reads the four score fields already on Contact.

export const SCORE_DIMENSIONS = [
  "fitScore",
  "companySignalScore",
  "contactSignalScore",
  "timingScore",
] as const;

export type ScoreDimensions = {
  fitScore: number;
  companySignalScore: number;
  contactSignalScore: number;
  timingScore: number;
};

export const DIMENSION_MAX = 5;
export const TOTAL_MAX = DIMENSION_MAX * SCORE_DIMENSIONS.length; // 20

export function computeDemandSignalScore(dims: ScoreDimensions): number {
  return (
    dims.fitScore + dims.companySignalScore + dims.contactSignalScore + dims.timingScore
  );
}

export type DemandPriority = "LOW" | "MONITOR" | "HIGH" | "HOT";

export function classifyDemandScore(total: number): DemandPriority {
  if (total <= 5) return "LOW";
  if (total <= 10) return "MONITOR";
  if (total <= 15) return "HIGH";
  return "HOT";
}

export const PRIORITY_LABELS: Record<DemandPriority, string> = {
  LOW: "BAJA",
  MONITOR: "MEDIA",
  HIGH: "ALTA",
  HOT: "MUY ALTA",
};

export const FIT_SCALE_LABELS: Record<number, string> = {
  0: "0 · No encaja / info. insuficiente",
  1: "1 · Muy bajo",
  2: "2 · Bajo",
  3: "3 · Moderado",
  4: "4 · Alto",
  5: "5 · Excelente fit",
};

export const COMPANY_SIGNAL_SCALE_LABELS: Record<number, string> = {
  0: "0 · Sin señal relevante",
  1: "1 · Señal débil",
  2: "2 · Señal moderada",
  3: "3 · Señal fuerte",
  4: "4 · Muy fuerte / varias señales",
  5: "5 · Crítica / clara razón para actuar",
};

export const CONTACT_SIGNAL_SCALE_LABELS: Record<number, string> = {
  0: "0 · Sin señal",
  1: "1 · Actividad débil",
  2: "2 · Actividad relevante",
  3: "3 · Cambio profesional relevante",
  4: "4 · Señal muy fuerte",
  5: "5 · Ligada a una necesidad comercial",
};

export const TIMING_SCALE_LABELS: Record<number, string> = {
  0: "0 · Sin indicio actual",
  1: "1 · Señal antigua",
  2: "2 · Relativamente reciente",
  3: "3 · Reciente",
  4: "4 · Muy reciente",
  5: "5 · Actual o inminente",
};

// Reference windows for suggesting a Timing score from how many days ago the
// most recent signal was detected. Kept as a small ordered table so the
// thresholds can be retuned later without touching any calling code.
export const TIMING_WINDOWS: { maxDays: number; score: number }[] = [
  { maxDays: 7, score: 5 },
  { maxDays: 30, score: 4 },
  { maxDays: 60, score: 3 },
  { maxDays: 90, score: 2 },
  { maxDays: 180, score: 1 },
  { maxDays: Infinity, score: 0 },
];

export function suggestTimingScore(mostRecentDetectedAt: Date | string | null): number | null {
  if (!mostRecentDetectedAt) return null;
  const detected = new Date(mostRecentDetectedAt);
  const daysAgo = Math.floor((Date.now() - detected.getTime()) / (1000 * 60 * 60 * 24));
  const window = TIMING_WINDOWS.find((w) => daysAgo <= w.maxDays);
  return window ? window.score : 0;
}
