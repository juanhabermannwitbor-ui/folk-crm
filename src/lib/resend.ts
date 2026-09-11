import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;
function getClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada en el servidor.");
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendSequenceEmail(params: {
  from: string;
  to: string;
  subject: string;
  text: string;
}) {
  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: params.from,
    to: [params.to],
    subject: params.subject,
    text: params.text,
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Resend no devolvió un id de mensaje.");
  }
  return data;
}

// Usado por el webhook de Resend para validar que el request viene realmente
// de Resend (headers svix-*) antes de tocar cualquier inscripción.
export function verifyResendWebhook(params: {
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}) {
  if (!process.env.RESEND_WEBHOOK_SECRET) {
    throw new Error("RESEND_WEBHOOK_SECRET no está configurada en el servidor.");
  }
  const resend = getClient();
  return resend.webhooks.verify({
    payload: params.payload,
    headers: {
      id: params.svixId,
      timestamp: params.svixTimestamp,
      signature: params.svixSignature,
    },
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
  });
}
