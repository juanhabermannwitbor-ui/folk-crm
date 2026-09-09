import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { updateStepSchema } from "@/lib/validation";

async function loadOwnedStep(workspaceId: string, sequenceId: string, stepId: string) {
  const step = await prisma.sequenceStep.findUnique({
    where: { id: stepId },
    include: { sequence: true },
  });
  if (!step || step.sequenceId !== sequenceId || step.sequence.workspaceId !== workspaceId) {
    return null;
  }
  return step;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, stepId } = await params;
  const existing = await loadOwnedStep(ctx.workspace.id, id, stepId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateStepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const step = await prisma.sequenceStep.update({ where: { id: stepId }, data: parsed.data });
  return NextResponse.json({ step });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, stepId } = await params;
  const existing = await loadOwnedStep(ctx.workspace.id, id, stepId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.sequenceStep.delete({ where: { id: stepId } });
  return NextResponse.json({ ok: true });
}
