import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { updateListSchema } from "@/lib/validation";

async function loadOwnedList(workspaceId: string, id: string) {
  const list = await prisma.contactList.findUnique({ where: { id } });
  if (!list || list.workspaceId !== workspaceId) return null;
  return list;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const list = await loadOwnedList(ctx.workspace.id, id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await prisma.contactListMember.findMany({
    where: { listId: id, contact: { deletedAt: null } },
    include: { contact: true },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json({
    list: {
      id: list.id,
      name: list.name,
      createdAt: list.createdAt,
      members: members.map((m) => m.contact),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedList(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const list = await prisma.contactList.update({
    where: { id },
    data: { ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}) },
  });

  return NextResponse.json({ list });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedList(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contactList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
