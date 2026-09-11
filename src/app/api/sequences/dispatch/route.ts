import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { sendSequenceEmail } from "@/lib/resend";
import { renderSequenceTemplate } from "@/lib/sequenceTemplate";

// Tope defensivo de envíos reales por corrida — el mismo criterio de
// calentamiento gradual (20-50/día) documentado para el subdominio de envío
// en PROJECT_BLUEPRINT.md §18. Configurable por env var para no tener que
// tocar código al subir el volumen progresivamente.
const DAILY_SEND_CAP = Number(process.env.SEQUENCES_DAILY_CAP) || 30;

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

type DueItem = {
  enrollmentId: string;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  currentStep: number;
  isLastStep: boolean;
  subject: string;
  body: string;
  dueAt: Date;
};

// Disparador manual (botón en Ajustes → "Secuencias") de los envíos reales de
// Secuencias vía Resend. Deliberadamente sin cron: se ejecuta solo cuando
// alguien lo pide, siguiendo el mismo criterio ya usado para el piloto de
// señales de HIRING (ver PROJECT_BLUEPRINT.md §18).
export async function POST() {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fromAddress = process.env.SEQUENCES_FROM_EMAIL;
  if (!fromAddress) {
    return NextResponse.json(
      { error: "Falta configurar SEQUENCES_FROM_EMAIL en el servidor." },
      { status: 400 }
    );
  }

  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: { status: "ACTIVE", sequence: { workspaceId: ctx.workspace.id } },
    include: { contact: true, sequence: { include: { steps: { orderBy: { order: "asc" } } } } },
  });

  const now = new Date();
  const due: DueItem[] = [];

  for (const enrollment of enrollments) {
    const step = enrollment.sequence.steps[enrollment.currentStep];
    if (!step) {
      // Ya no queda ningún paso (por ejemplo, se borró el último paso
      // después de inscribirla) — se cierra en vez de quedar activa sin
      // nada pendiente.
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED" },
      });
      continue;
    }

    const basis = enrollment.lastStepSentAt ?? enrollment.enrolledAt;
    const dueAt = addDays(basis, step.delayDays);
    if (dueAt > now) continue;

    due.push({
      enrollmentId: enrollment.id,
      contactId: enrollment.contactId,
      contactName: enrollment.contact.fullName,
      contactEmail: enrollment.contact.email,
      currentStep: enrollment.currentStep,
      isLastStep: enrollment.currentStep + 1 >= enrollment.sequence.steps.length,
      subject: renderSequenceTemplate(step.subject, enrollment.contact),
      body: renderSequenceTemplate(step.body, enrollment.contact),
      dueAt,
    });
  }

  due.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const batch = due.slice(0, DAILY_SEND_CAP);

  let sent = 0;
  let skippedNoEmail = 0;
  let failed = 0;
  const details: { contact: string; step: number; result: string }[] = [];

  for (const item of batch) {
    if (!item.contactEmail) {
      skippedNoEmail++;
      details.push({ contact: item.contactName, step: item.currentStep, result: "sin email" });
      continue;
    }

    try {
      const message = await sendSequenceEmail({
        from: fromAddress,
        to: item.contactEmail,
        subject: item.subject,
        text: item.body,
      });

      await prisma.sequenceEnrollment.update({
        where: { id: item.enrollmentId },
        data: {
          currentStep: item.currentStep + 1,
          lastStepSentAt: now,
          lastMessageId: message.id,
          status: item.isLastStep ? "COMPLETED" : "ACTIVE",
        },
      });
      sent++;
      details.push({ contact: item.contactName, step: item.currentStep, result: "enviado" });
    } catch (err) {
      failed++;
      const messageText = err instanceof Error ? err.message : "error desconocido";
      details.push({ contact: item.contactName, step: item.currentStep, result: `error: ${messageText}` });
    }
  }

  return NextResponse.json({
    dueToday: due.length,
    dailyCap: DAILY_SEND_CAP,
    sent,
    skippedNoEmail,
    failed,
    details,
  });
}
