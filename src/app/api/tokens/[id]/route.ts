import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.apiToken.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.apiToken.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
