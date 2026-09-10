import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

async function loadOwnedList(workspaceId: string, id: string) {
  const list = await prisma.contactList.findUnique({ where: { id } });
  if (!list || list.workspaceId !== workspaceId) return null;
  return list;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, contactId } = await params;
  const list = await loadOwnedList(ctx.workspace.id, id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contactListMember.deleteMany({ where: { listId: id, contactId } });
  return NextResponse.json({ ok: true });
}
