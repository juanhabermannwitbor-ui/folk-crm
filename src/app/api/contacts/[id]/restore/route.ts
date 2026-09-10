import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

async function loadOwnedContact(workspaceId: string, id: string) {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.workspaceId !== workspaceId) return null;
  return contact;
}

// Restores a contact archived via DELETE /api/contacts/[id] (soft delete).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedContact(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contact = await prisma.contact.update({ where: { id }, data: { deletedAt: null } });
  return NextResponse.json({ contact });
}
