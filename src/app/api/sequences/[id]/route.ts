import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createSequenceSchema } from "@/lib/validation";

async function loadOwnedSequence(workspaceId: string, id: string) {
  const sequence = await prisma.sequence.findUnique({ where: { id } });
  if (!sequence || sequence.workspaceId !== workspaceId) return null;
  return sequence;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedSequence(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sequence = await prisma.sequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" } },
      enrollments: { include: { contact: true }, orderBy: { enrolledAt: "desc" } },
    },
  });

  return NextResponse.json({ sequence });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedSequence(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = createSequenceSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sequence = await prisma.sequence.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ sequence });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedSequence(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.sequence.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
