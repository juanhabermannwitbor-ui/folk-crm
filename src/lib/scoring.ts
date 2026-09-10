// Demand Signal Scoring — pure calculation helpers, deliberately kept
// separate from how a Signal gets created. Nothing here cares whether a
// Signal was typed in by hand or produced later by an automated source;
// it only reads the four score fields already on Contact.
import type { SignalConfidence, SignalType } from "@/lib/types";

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

// Which Signal types count as evidence for each of the two "señales
// detectadas"-driven dimensions. LEADERSHIP is bucketed under contact (a
// person taking on a new role) per the original examples given for each
// dimension; NEWS/OTHER default to company since they're rarely about one
// specific person.
export const COMPANY_SIGNAL_TYPES: SignalType[] = [
  "COMPANY",
  "HIRING",
  "TECHNOLOGY",
  "GROWTH",
  "FUNDING",
  "EXPANSION",
  "NEWS",
];

export const CONTACT_SIGNAL_TYPES: SignalType[] = ["CONTACT", "LEADERSHIP"];

// Each señal contributes "points" toward its dimension's suggestion based on
// how confident it is — more/stronger evidence pushes the suggested score
// up. Kept as a small table (like TIMING_WINDOWS) so the weighting is easy
// to retune later.
const SIGNAL_STRENGTH_POINTS: Record<SignalConfidence, number> = {
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0.5,
};

const SIGNAL_STRENGTH_WINDOWS: { minPoints: number; score: number }[] = [
  { minPoints: 5, score: 5 },
  { minPoints: 3.5, score: 4 },
  { minPoints: 2, score: 3 },
  { minPoints: 1, score: 2 },
  { minPoints: 0.01, score: 1 },
  { minPoints: 0, score: 0 },
];

// Suggests a Company Signal / Contact Signal score from the señales
// actually loaded for the contact, so cargar evidencia ahí tiene un efecto
// visible en la priorización — sin pisar el valor manual: es una sugerencia
// que el usuario aplica con un clic, igual que ya pasa con Timing.
export function suggestSignalDimensionScore(
  signals: { type: SignalType; confidence: SignalConfidence }[],
  relevantTypes: SignalType[]
): number | null {
  const relevant = signals.filter((s) => relevantTypes.includes(s.type));
  if (relevant.length === 0) return null;
  const points = relevant.reduce((sum, s) => sum + SIGNAL_STRENGTH_POINTS[s.confidence], 0);
  const window = SIGNAL_STRENGTH_WINDOWS.find((w) => points >= w.minPoints);
  return window ? window.score : 0;
}
