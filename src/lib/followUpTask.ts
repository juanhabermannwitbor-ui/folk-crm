import "server-only";
import { prisma } from "@/lib/prisma";
import type { Contact } from "@prisma/client";
import { FOLLOW_UP_ACTION_LABELS } from "@/lib/types";

// Keeps a contact's "Próximo seguimiento" (date + action) mirrored as a task
// on the Tareas page. One-directional: editing it here creates/updates/
// removes the linked task; completing that task does not clear the fields
// back on the contact.
export async function syncFollowUpTask(contact: Contact) {
  const existing = await prisma.task.findFirst({
    where: { contactId: contact.id, isFollowUp: true },
  });

  if (!contact.nextFollowUpAt) {
    if (existing) await prisma.task.delete({ where: { id: existing.id } });
    return;
  }

  const title = contact.nextFollowUpAction
    ? `${FOLLOW_UP_ACTION_LABELS[contact.nextFollowUpAction]}: ${contact.fullName}`
    : `Seguimiento: ${contact.fullName}`;

  if (existing) {
    // Only reopen a completed task if the date actually moved — editing
    // an unrelated field on the contact shouldn't undo "done".
    const dateChanged = existing.dueDate?.getTime() !== contact.nextFollowUpAt.getTime();
    await prisma.task.update({
      where: { id: existing.id },
      data: {
        title,
        dueDate: contact.nextFollowUpAt,
        actionType: contact.nextFollowUpAction,
        ...(dateChanged ? { completed: false, completedAt: null } : {}),
      },
    });
  } else {
    await prisma.task.create({
      data: {
        workspaceId: contact.workspaceId,
        contactId: contact.id,
        title,
        dueDate: contact.nextFollowUpAt,
        actionType: contact.nextFollowUpAction,
        isFollowUp: true,
      },
    });
  }
}
