import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createTaskSchema } from "@/lib/validation";

export async function GET() {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { contact: true },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
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

  const task = await prisma.task.create({
    data: {
      workspaceId: ctx.workspace.id,
      title: data.title,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contactId: data.contactId || null,
      actionType: data.actionType || null,
    },
    include: { contact: true },
  });

  return NextResponse.json({ task }, { status: 201 });
}
