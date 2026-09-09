import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createStageSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.pipelineStage.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createStageSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const stage = await prisma.pipelineStage.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ stage });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.pipelineStage.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stageCount = await prisma.pipelineStage.count({ where: { workspaceId: ctx.workspace.id } });
  if (stageCount <= 1) {
    return NextResponse.json({ error: "At least one stage is required" }, { status: 400 });
  }

  await prisma.pipelineStage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
