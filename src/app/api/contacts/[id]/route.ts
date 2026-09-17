import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { updateContactSchema } from "@/lib/validation";
import { syncFollowUpTask } from "@/lib/followUpTask";
import { buildFullName } from "@/lib/contactName";

async function loadOwnedContact(workspaceId: string, id: string) {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.workspaceId !== workspaceId) return null;
  return contact;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedContact(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const nextCategory = data.category ?? existing.category;

  // stageOrder-only PATCHes (pipeline drag reconciliation) send neither
  // field — recomputing fullName from the existing values in that case
  // would be a no-op, but skip the write entirely when nothing named
  // changed rather than doing pointless work on every drag.
  const nameChanged = data.firstName !== undefined || data.lastName !== undefined;
  const nextFirstName = data.firstName ?? existing.firstName;
  const nextLastName = data.lastName !== undefined ? data.lastName || null : existing.lastName;

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(nameChanged
        ? {
            firstName: nextFirstName,
            lastName: nextLastName,
            fullName: buildFullName(nextFirstName, nextLastName),
          }
        : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.headline !== undefined ? { headline: data.headline || null } : {}),
      ...(data.company !== undefined ? { company: data.company || null } : {}),
      ...(data.title !== undefined ? { title: data.title || null } : {}),
      ...(data.location !== undefined ? { location: data.location || null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.linkedinUrl !== undefined ? { linkedinUrl: data.linkedinUrl || null } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.dealValue !== undefined ? { dealValue: data.dealValue } : {}),
      ...(data.nextFollowUpAt !== undefined
        ? { nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null }
        : {}),
      ...(data.nextFollowUpAction !== undefined
        ? { nextFollowUpAction: data.nextFollowUpAction || null }
        : {}),
      ...(data.stageOrder !== undefined ? { stageOrder: data.stageOrder } : {}),
      ...(data.fitScore !== undefined ? { fitScore: data.fitScore } : {}),
      ...(data.companySignalScore !== undefined
        ? { companySignalScore: data.companySignalScore }
        : {}),
      ...(data.contactSignalScore !== undefined
        ? { contactSignalScore: data.contactSignalScore }
        : {}),
      ...(data.timingScore !== undefined ? { timingScore: data.timingScore } : {}),
      ...(data.whyNow !== undefined ? { whyNow: data.whyNow || null } : {}),
      ...(data.nextBestAction !== undefined
        ? { nextBestAction: data.nextBestAction || null }
        : {}),
      ...(nextCategory !== "LEAD"
        ? { pipelineStageId: null }
        : data.pipelineStageId !== undefined
          ? { pipelineStageId: data.pipelineStageId }
          : {}),
    },
  });

  if (data.category !== undefined && data.category !== existing.category) {
    await prisma.contactAudit.create({
      data: {
        workspaceId: ctx.workspace.id,
        contactId: id,
        field: "category",
        oldValue: existing.category,
        newValue: data.category,
      },
    });
  }

  await syncFollowUpTask(contact);

  return NextResponse.json({ contact });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedContact(ctx.workspace.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Normal delete (from a contact list) archives instead of removing the
  // row, so it can be restored from the Papelera in Ajustes. Only that
  // trash view passes ?permanent=true, for an actual, unrecoverable delete.
  const permanent = request.nextUrl.searchParams.get("permanent") === "true";
  if (permanent) {
    await prisma.contact.delete({ where: { id } });
  } else {
    await prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  return NextResponse.json({ ok: true });
}
