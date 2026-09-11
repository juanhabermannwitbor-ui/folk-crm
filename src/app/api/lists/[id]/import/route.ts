import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { listImportSchema, sanitizeHttpUrl } from "@/lib/validation";

async function loadOwnedList(workspaceId: string, id: string) {
  const list = await prisma.contactList.findUnique({ where: { id } });
  if (!list || list.workspaceId !== workspaceId) return null;
  return list;
}

// Importar un CSV/XLSX directo a una lista. A diferencia de
// /api/contacts/import (que siempre crea, con una categoría fija), acá cada
// fila con email intenta reusar un contacto ya existente en el workspace —
// tenga la categoría que tenga — y solo crea uno nuevo (INTERESTING) si no
// hay match. En los dos casos, el contacto termina como miembro de la lista.
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
  const parsed = listImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingByEmail = await prisma.contact.findMany({
    where: { workspaceId: ctx.workspace.id, deletedAt: null, email: { not: null } },
    select: { id: true, email: true },
  });
  const emailToContactId = new Map(
    existingByEmail.map((c) => [c.email!.trim().toLowerCase(), c.id])
  );

  const existingMembers = await prisma.contactListMember.findMany({
    where: { listId: id },
    select: { contactId: true },
  });
  const memberIds = new Set(existingMembers.map((m) => m.contactId));

  let createdCount = 0;
  let matchedCount = 0;
  const addedContactIds: string[] = [];
  let skippedInvalid = 0;

  for (const row of parsed.data.contacts) {
    const fullName = row.fullName.trim();
    if (!fullName) {
      skippedInvalid++;
      continue;
    }

    const email = row.email?.trim() || null;
    const emailKey = email?.toLowerCase() ?? null;
    let contactId = emailKey ? emailToContactId.get(emailKey) : undefined;

    if (contactId) {
      matchedCount++;
    } else {
      const contact = await prisma.contact.create({
        data: {
          workspaceId: ctx.workspace.id,
          category: "INTERESTING",
          source: "IMPORT",
          fullName,
          email,
          phone: row.phone?.trim() || null,
          company: row.company?.trim() || null,
          title: row.title?.trim() || null,
          location: row.location?.trim() || null,
          linkedinUrl: sanitizeHttpUrl(row.linkedinUrl),
          notes: row.notes?.trim() || null,
        },
      });
      createdCount++;
      contactId = contact.id;
      if (emailKey) emailToContactId.set(emailKey, contactId);
    }

    if (memberIds.has(contactId)) continue;
    await prisma.contactListMember.create({ data: { listId: id, contactId } });
    memberIds.add(contactId);
    addedContactIds.push(contactId);
  }

  // Devuelve el registro completo de cada contacto que terminó en la lista
  // (recién creado o reusado) — el cliente lo necesita para actualizar la
  // tabla sin tener que recargar la página.
  const addedContacts = await prisma.contact.findMany({ where: { id: { in: addedContactIds } } });

  return NextResponse.json({
    contacts: addedContacts,
    createdCount,
    matchedCount,
    addedToList: addedContactIds.length,
    skippedInvalid,
  });
}
