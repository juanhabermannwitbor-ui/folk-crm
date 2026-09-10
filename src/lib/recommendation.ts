// Recomendación de Acción — motor de reglas determinístico.
//
// Toda la lógica de "qué hacer con este prospecto" vive acá, aislada de los
// componentes de UI. Hoy son reglas fijas sobre los 4 puntajes de Demand
// Signal Scoring; el día que se sumen señales automáticas, IA para
// interpretarlas, o nuevas fuentes (Apollo/Apify/otros), esta función es el
// único lugar que hay que tocar — la UI y el resto del CRM no cambian.
import type { ScoreDimensions } from "@/lib/scoring";
import { computeDemandSignalScore } from "@/lib/scoring";
import type { NextBestAction } from "@/lib/types";

export type RecommendationLevel = "ACT_NOW" | "PREPARE_CONTACT" | "MONITOR" | "DO_NOT_PRIORITIZE";

export const RECOMMENDATION_LABELS: Record<RecommendationLevel, string> = {
  ACT_NOW: "Actuar ahora",
  PREPARE_CONTACT: "Preparar contacto",
  MONITOR: "Monitorear",
  DO_NOT_PRIORITIZE: "No priorizar",
};

export const RECOMMENDATION_DESCRIPTIONS: Record<RecommendationLevel, string> = {
  ACT_NOW:
    "Este prospecto presenta señales suficientes para justificar una acción comercial prioritaria.",
  PREPARE_CONTACT:
    "El prospecto presenta señales relevantes. Revisá el contexto y prepará un contacto personalizado.",
  MONITOR:
    "El prospecto tiene potencial, pero todavía no hay suficiente evidencia para priorizar un contacto inmediato.",
  DO_NOT_PRIORITIZE:
    "Actualmente no hay suficiente evidencia para dedicar esfuerzo comercial a este prospecto.",
};

export type SuggestedAction =
  | { kind: "SET_NEXT_BEST_ACTION"; label: string; value: NextBestAction }
  | { kind: "CREATE_TASK"; label: string }
  | { kind: "OPEN_COMPOSE"; label: string }
  | { kind: "INFO"; label: string };

const SUGGESTED_ACTIONS: Record<RecommendationLevel, SuggestedAction[]> = {
  ACT_NOW: [
    { kind: "SET_NEXT_BEST_ACTION", label: "Contactar", value: "CONTACT" },
    { kind: "CREATE_TASK", label: "Crear tarea" },
    { kind: "OPEN_COMPOSE", label: "Preparar mensaje" },
  ],
  PREPARE_CONTACT: [
    { kind: "SET_NEXT_BEST_ACTION", label: "Investigar", value: "INVESTIGATE" },
    { kind: "CREATE_TASK", label: "Crear tarea" },
    { kind: "OPEN_COMPOSE", label: "Preparar mensaje" },
  ],
  MONITOR: [
    { kind: "SET_NEXT_BEST_ACTION", label: "Agregar seguimiento", value: "SCHEDULE_FOLLOWUP" },
    { kind: "INFO", label: "Revisar señales más adelante" },
  ],
  DO_NOT_PRIORITIZE: [
    { kind: "INFO", label: "Mantener en CRM" },
    { kind: "SET_NEXT_BEST_ACTION", label: "No realizar acción por ahora", value: "DO_NOT_CONTACT" },
  ],
};

export type RecommendedAction = {
  level: RecommendationLevel;
  label: string;
  description: string;
  reason: string;
  suggestedActions: SuggestedAction[];
};

// Motivo dinámico para la Regla 3 (score + timing): arma una frase a partir
// de qué dimensiones son las que más aportan, en lugar de un texto fijo.
function describeContributingFactors(dims: ScoreDimensions): string {
  const parts: string[] = [];

  if (dims.fitScore >= 4) parts.push("un alto nivel de encaje");
  else if (dims.fitScore === 3) parts.push("un buen nivel de encaje");

  if (dims.companySignalScore >= 4) parts.push("señales muy fuertes de la empresa");
  else if (dims.companySignalScore === 3) parts.push("señales relevantes de la empresa");

  if (dims.contactSignalScore >= 4) parts.push("señales muy fuertes del contacto");
  else if (dims.contactSignalScore === 3) parts.push("señales relevantes del contacto");

  if (dims.timingScore >= 4) parts.push("señales muy recientes");
  else if (dims.timingScore === 3) parts.push("señales recientes");

  if (parts.length === 0) {
    return "El puntaje total justifica una acción prioritaria.";
  }
  const joined =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1) + ".";
}

// Reglas evaluadas en orden — la primera que matchea gana. El orden respeta
// la prioridad indicada: Fit muy bajo > Actuar ahora (contacto) > Actuar
// ahora (score) > Preparar contacto > Monitorear (empresa) > Monitorear
// (score) > No priorizar.
export function getRecommendedAction(dims: ScoreDimensions): RecommendedAction {
  const total = computeDemandSignalScore(dims);
  const { fitScore, companySignalScore, contactSignalScore, timingScore } = dims;

  let level: RecommendationLevel;
  let reason: string;

  if (fitScore <= 2) {
    // Regla 1 — tiene prioridad sobre todas las demás, incluso con señales fuertes.
    level = "DO_NOT_PRIORITIZE";
    reason = "El prospecto presenta un bajo nivel de encaje con el perfil objetivo.";
  } else if (contactSignalScore >= 3 && timingScore >= 4 && fitScore >= 3) {
    // Regla 2 — actuar ahora por señal de contacto, aunque el score total no llegue a 16.
    level = "ACT_NOW";
    reason =
      "Existe una señal relevante sobre el contacto y es suficientemente reciente como para justificar una acción.";
  } else if (total >= 16 && timingScore >= 3) {
    // Regla 3 — actuar ahora por score total.
    level = "ACT_NOW";
    reason = describeContributingFactors(dims);
  } else if (total >= 11 && timingScore >= 3) {
    // Regla 4.
    level = "PREPARE_CONTACT";
    reason =
      "El prospecto presenta un buen nivel de prioridad y señales recientes, pero conviene revisar el contexto antes de contactar.";
  } else if (companySignalScore >= 4 && timingScore <= 2) {
    // Regla 5 — señal fuerte de empresa pero sin timing reciente.
    level = "MONITOR";
    reason =
      "Se detectaron señales relevantes en la empresa, pero todavía no son suficientemente recientes como para justificar una acción inmediata.";
  } else if (total >= 6 && total <= 10) {
    // Regla 6.
    level = "MONITOR";
    reason =
      "El prospecto presenta cierto potencial, pero todavía no hay suficiente evidencia para priorizar una acción comercial.";
  } else if (total <= 5) {
    // Regla 7.
    level = "DO_NOT_PRIORITIZE";
    reason = "Actualmente hay pocas señales y/o bajo encaje con el perfil objetivo.";
  } else {
    // Caso no cubierto explícitamente por las reglas dadas: score alto (11+)
    // pero sin timing ni señal de empresa suficientes para las reglas 4 o 5.
    // Se prioriza MONITOREAR antes que descartarlo directamente.
    level = "MONITOR";
    reason =
      "El prospecto tiene un puntaje alto, pero no hay señales lo suficientemente recientes como para justificar una acción inmediata.";
  }

  return {
    level,
    label: RECOMMENDATION_LABELS[level],
    description: RECOMMENDATION_DESCRIPTIONS[level],
    reason,
    suggestedActions: SUGGESTED_ACTIONS[level],
  };
}
