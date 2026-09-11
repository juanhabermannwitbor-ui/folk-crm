import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyResendWebhook } from "@/lib/resend";

// Eventos que ameritan frenar la secuencia de ese contacto — seguir
// insistiéndole a una dirección que rebotó o se quejó de spam solo empeora
// la reputación del subdominio de envío (ver PROJECT_BLUEPRINT.md §18).
const STOP_EVENTS: Record<string, string> = {
  "email.bounced": "Rebote de email",
  "email.complained": "Marcado como spam por el destinatario",
};

type ResendWebhookPayload = { type?: string; data?: { email_id?: string } };

// Recibe los eventos de Resend (rebote/queja/entregado/abierto/click) para el
// dominio de envío de Secuencias. No pasa por requireWorkspace — lo llama
// Resend directamente, sin sesión de usuario — la autenticación acá es la
// firma svix, no una cookie. Por eso esta ruta está excluida del proxy de
// sesión en src/proxy.ts, igual que /api/extension.
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Faltan headers de firma" }, { status: 400 });
  }

  let event: ResendWebhookPayload;
  try {
    event = (await verifyResendWebhook({
      payload,
      svixId,
      svixTimestamp,
      svixSignature,
    })) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const messageId = event.data?.email_id;
  const stopReason = event.type ? STOP_EVENTS[event.type] : undefined;

  if (messageId && stopReason) {
    await prisma.sequenceEnrollment.updateMany({
      where: { lastMessageId: messageId, status: "ACTIVE" },
      data: { status: "STOPPED", stopReason },
    });
  }

  return NextResponse.json({ ok: true });
}
