import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createStageSchema, reorderStagesSchema } from "@/lib/validation";

export async function GET() {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stages = await prisma.pipelineStage.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ stages });
}

export async function POST(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const last = await prisma.pipelineStage.findFirst({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { order: "desc" },
  });

  const stage = await prisma.pipelineStage.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      color: parsed.data.color ?? "#6366f1",
      order: (last?.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ stage }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = reorderStagesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ids = parsed.data.stages.map((s) => s.id);
  const owned = await prisma.pipelineStage.findMany({
    where: { id: { in: ids }, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  if (owned.length !== ids.length) {
    return NextResponse.json({ error: "Unknown stage id" }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.stages.map((s) =>
      prisma.pipelineStage.update({
        where: { id: s.id },
        data: { order: s.order + 1000 }, // shift out of the way to dodge the unique (workspaceId, order) constraint
      })
    )
  );
  await prisma.$transaction(
    parsed.data.stages.map((s) =>
      prisma.pipelineStage.update({ where: { id: s.id }, data: { order: s.order } })
    )
  );

  return NextResponse.json({ ok: true });
}
