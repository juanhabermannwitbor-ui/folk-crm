import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { updateEnrollmentSchema } from "@/lib/validation";

async function loadOwnedEnrollment(workspaceId: string, sequenceId: string, enrollmentId: string) {
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { sequence: true },
  });
  if (
    !enrollment ||
    enrollment.sequenceId !== sequenceId ||
    enrollment.sequence.workspaceId !== workspaceId
  ) {
    return null;
  }
  return enrollment;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, enrollmentId } = await params;
  const existing = await loadOwnedEnrollment(ctx.workspace.id, id, enrollmentId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateEnrollmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const enrollment = await prisma.sequenceEnrollment.update({
    where: { id: enrollmentId },
    data: parsed.data,
    include: { contact: true },
  });

  return NextResponse.json({ enrollment });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, enrollmentId } = await params;
  const existing = await loadOwnedEnrollment(ctx.workspace.id, id, enrollmentId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.sequenceEnrollment.delete({ where: { id: enrollmentId } });
  return NextResponse.json({ ok: true });
}
