import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { updateSignalSchema } from "@/lib/validation";

async function loadOwnedSignal(workspaceId: string, contactId: string, signalId: string) {
  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal || signal.contactId !== contactId || signal.workspaceId !== workspaceId) {
    return null;
  }
  return signal;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signalId: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, signalId } = await params;
  const existing = await loadOwnedSignal(ctx.workspace.id, id, signalId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateSignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const signal = await prisma.signal.update({
    where: { id: signalId },
    data: {
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.source !== undefined ? { source: data.source || null } : {}),
      ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
      ...(data.detectedAt !== undefined ? { detectedAt: new Date(data.detectedAt) } : {}),
    },
  });

  return NextResponse.json({ signal });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; signalId: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, signalId } = await params;
  const existing = await loadOwnedSignal(ctx.workspace.id, id, signalId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.signal.delete({ where: { id: signalId } });
  return NextResponse.json({ ok: true });
}
