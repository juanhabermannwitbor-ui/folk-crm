import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { bulkEnrollSchema } from "@/lib/validation";

async function loadOwnedSequence(workspaceId: string, id: string) {
  const sequence = await prisma.sequence.findUnique({ where: { id } });
  if (!sequence || sequence.workspaceId !== workspaceId) return null;
  return sequence;
}

// Enrolls many contacts at once (e.g. every member of a Lista) — same rule
// as the single-contact endpoint (one enrollment per sequence/contact
// pair), just applied to a batch instead of looping one request at a time.
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
  const parsed = bulkEnrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const owned = await prisma.contact.findMany({
    where: { id: { in: parsed.data.contactIds }, workspaceId: ctx.workspace.id, deletedAt: null },
    select: { id: true },
  });

  const existing = await prisma.sequenceEnrollment.findMany({
    where: { sequenceId: id, contactId: { in: owned.map((c) => c.id) } },
    select: { contactId: true },
  });
  const existingIds = new Set(existing.map((e) => e.contactId));
  const toEnroll = owned.filter((c) => !existingIds.has(c.id));

  if (toEnroll.length > 0) {
    await prisma.sequenceEnrollment.createMany({
      data: toEnroll.map((c) => ({ sequenceId: id, contactId: c.id })),
    });
  }

  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: { sequenceId: id, contactId: { in: toEnroll.map((c) => c.id) } },
    include: { contact: true },
  });

  return NextResponse.json({ enrollments, enrolledCount: toEnroll.length, alreadyEnrolled: existingIds.size });
}
