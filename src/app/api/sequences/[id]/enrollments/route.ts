import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createEnrollmentSchema } from "@/lib/validation";

async function loadOwnedSequence(workspaceId: string, id: string) {
  const sequence = await prisma.sequence.findUnique({ where: { id } });
  if (!sequence || sequence.workspaceId !== workspaceId) return null;
  return sequence;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sequence = await loadOwnedSequence(ctx.workspace.id, id);
  if (!sequence) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = createEnrollmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const contact = await prisma.contact.findUnique({ where: { id: parsed.data.contactId } });
  if (!contact || contact.workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const existing = await prisma.sequenceEnrollment.findUnique({
    where: { sequenceId_contactId: { sequenceId: id, contactId: contact.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Ese contacto ya está inscrito" }, { status: 409 });
  }

  const enrollment = await prisma.sequenceEnrollment.create({
    data: { sequenceId: id, contactId: contact.id },
    include: { contact: true },
  });

  return NextResponse.json({ enrollment }, { status: 201 });
}
