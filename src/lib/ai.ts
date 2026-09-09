import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Contact } from "@prisma/client";

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no está configurada en el servidor.");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const TONE_LABELS: Record<string, string> = {
  profesional: "profesional y formal",
  cercano: "cercano pero profesional",
  directo: "directo y breve, al grano",
};

// With a real contact, the model writes ready-to-send copy using their
// actual details. Without one, it writes a reusable template using the same
// {{token}} placeholders the sequence builder already knows how to render,
// so the draft can go straight into a step used across many contacts.
function buildPrompt({
  channel,
  goal,
  tone,
  contact,
}: {
  channel: "EMAIL" | "LINKEDIN";
  goal: string;
  tone: string;
  contact: Contact | null;
}) {
  const toneLabel = TONE_LABELS[tone] ?? tone;
  const channelRules =
    channel === "EMAIL"
      ? "Es un email de prospección. Escribí un asunto corto (menos de 60 caracteres) y un cuerpo de 60 a 130 palabras, en español, sin firma ni despedida formal tipo 'Saludos cordiales' (una despedida breve de una línea está bien)."
      : "Es un mensaje de LinkedIn (nota de conexión o DM). Escribí solo el cuerpo, sin asunto, máximo 400 caracteres, tono conversacional, sin firma.";

  const personalization = contact
    ? `Escribí el mensaje ya personalizado para esta persona real, usando estos datos donde sea relevante (no inventes datos que falten, simplemente no los menciones):\n- Nombre: ${contact.fullName}\n- Cargo: ${contact.title ?? "(sin dato)"}\n- Empresa: ${contact.company ?? "(sin dato)"}\n- Ubicación: ${contact.location ?? "(sin dato)"}\n- Notas: ${contact.notes ?? "(sin dato)"}`
    : `No hay un contacto específico todavía — este mensaje se va a reutilizar para muchos contactos distintos. Escribilo como plantilla, usando estos placeholders literales donde corresponda personalizar: {{nombre}} (primer nombre), {{empresa}}, {{cargo}}, {{ubicacion}}. No inventes placeholders nuevos, usá solo estos.`;

  return `Objetivo del mensaje: ${goal}\nTono: ${toneLabel}\n${channelRules}\n\n${personalization}`;
}

const emailSchema = z.object({
  subject: z.string().describe("Asunto del correo, menos de 60 caracteres"),
  body: z.string().describe("Cuerpo del mensaje"),
});

const linkedinSchema = z.object({
  body: z.string().describe("Cuerpo del mensaje de LinkedIn, sin asunto"),
});

export async function composeMessage(params: {
  channel: "EMAIL" | "LINKEDIN";
  goal: string;
  tone: string;
  contact: Contact | null;
}) {
  const anthropic = getClient();
  const schema = params.channel === "EMAIL" ? emailSchema : linkedinSchema;

  const response = await anthropic.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system:
      "Sos un copywriter de ventas B2B en español (España/Latinoamérica neutro). Escribís mensajes de prospección cortos, humanos y sin clichés de marketing ('revolucionario', 'solución integral', etc). Nunca uses signos de exclamación en exceso ni emojis salvo que el tono pedido sea muy informal.",
    messages: [{ role: "user", content: buildPrompt(params) }],
    output_config: { format: zodOutputFormat(schema) },
  });

  if (!response.parsed_output) {
    throw new Error("No se pudo generar el mensaje. Probá de nuevo.");
  }

  return response.parsed_output as z.infer<typeof schema>;
}
