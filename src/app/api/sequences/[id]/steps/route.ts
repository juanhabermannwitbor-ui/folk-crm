import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createStepSchema, reorderStepsSchema } from "@/lib/validation";

async function loadOwnedSequence(workspaceId: string, id: string) {
  const sequence = await prisma.sequence.findUnique({ where: { id } });
  if (!sequence || sequence.workspaceId !== workspaceId) return null;
  return sequence;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sequence = await loadOwnedSequence(ctx.workspace.id, id);
  if (!sequence) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = createStepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const last = await prisma.sequenceStep.findFirst({
    where: { sequenceId: id },
    orderBy: { order: "desc" },
  });

  const step = await prisma.sequenceStep.create({
    data: {
      sequenceId: id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      delayDays: parsed.data.delayDays,
      order: (last?.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ step }, { status: 201 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sequence = await loadOwnedSequence(ctx.workspace.id, id);
  if (!sequence) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = reorderStepsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ids = parsed.data.steps.map((s) => s.id);
  const owned = await prisma.sequenceStep.findMany({
    where: { id: { in: ids }, sequenceId: id },
    select: { id: true },
  });
  if (owned.length !== ids.length) {
    return NextResponse.json({ error: "Unknown step id" }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.steps.map((s) =>
      prisma.sequenceStep.update({ where: { id: s.id }, data: { order: s.order + 1000 } })
    )
  );
  await prisma.$transaction(
    parsed.data.steps.map((s) =>
      prisma.sequenceStep.update({ where: { id: s.id }, data: { order: s.order } })
    )
  );

  return NextResponse.json({ ok: true });
}
