import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { addListMembersSchema } from "@/lib/validation";

async function loadOwnedList(workspaceId: string, id: string) {
  const list = await prisma.contactList.findUnique({ where: { id } });
  if (!list || list.workspaceId !== workspaceId) return null;
  return list;
}

// Adds contacts to a list. Ownership of each contact is checked (must
// belong to this workspace); already-a-member is silently skipped rather
// than erroring, since the "member of" relation has no meaningful order.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const list = await loadOwnedList(ctx.workspace.id, id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = addListMembersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const owned = await prisma.contact.findMany({
    where: { id: { in: parsed.data.contactIds }, workspaceId: ctx.workspace.id },
    select: { id: true },
  });

  const existing = await prisma.contactListMember.findMany({
    where: { listId: id, contactId: { in: owned.map((c) => c.id) } },
    select: { contactId: true },
  });
  const existingIds = new Set(existing.map((m) => m.contactId));
  const toAdd = owned.filter((c) => !existingIds.has(c.id));

  if (toAdd.length > 0) {
    await prisma.contactListMember.createMany({
      data: toAdd.map((c) => ({ listId: id, contactId: c.id })),
    });
  }

  return NextResponse.json({ added: toAdd.length, alreadyInList: existingIds.size });
}
