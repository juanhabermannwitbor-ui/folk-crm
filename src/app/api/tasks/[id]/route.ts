import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { updateTaskSchema } from "@/lib/validation";

async function loadOwnedTask(workspaceId: string, id: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.workspaceId !== workspaceId) return null;
  return task;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedTask(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.contactId) {
    const contact = await prisma.contact.findUnique({ where: { id: data.contactId } });
    if (!contact || contact.workspaceId !== ctx.workspace.id) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.contactId !== undefined ? { contactId: data.contactId || null } : {}),
      ...(data.completed !== undefined
        ? { completed: data.completed, completedAt: data.completed ? new Date() : null }
        : {}),
      ...(data.actionType !== undefined ? { actionType: data.actionType || null } : {}),
    },
    include: { contact: true },
  });

  return NextResponse.json({ task });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedTask(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
