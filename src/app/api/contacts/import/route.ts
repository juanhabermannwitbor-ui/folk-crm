import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { importContactsSchema, sanitizeHttpUrl } from "@/lib/validation";

// Bulk-creates contacts parsed client-side from a CSV/XLSX upload. Skips
// rows without a name and rows whose email already exists in this
// workspace (case-insensitive), so re-importing the same file is safe.
export async function POST(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = importContactsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { category, contacts: rows } = parsed.data;

  const existing = await prisma.contact.findMany({
    where: { workspaceId: ctx.workspace.id, deletedAt: null, email: { not: null } },
    select: { email: true },
  });
  const seenEmails = new Set(existing.map((c) => c.email!.trim().toLowerCase()));

  const created: Awaited<ReturnType<typeof prisma.contact.create>>[] = [];
  let skippedInvalid = 0;
  let skippedDuplicate = 0;

  for (const row of rows) {
    const fullName = row.fullName.trim();
    if (!fullName) {
      skippedInvalid++;
      continue;
    }

    const email = row.email?.trim() || null;
    const emailKey = email?.toLowerCase() ?? null;
    if (emailKey && seenEmails.has(emailKey)) {
      skippedDuplicate++;
      continue;
    }

    const contact = await prisma.contact.create({
      data: {
        workspaceId: ctx.workspace.id,
        category,
        source: "IMPORT",
        fullName,
        email,
        phone: row.phone?.trim() || null,
        company: row.company?.trim() || null,
        title: row.title?.trim() || null,
        location: row.location?.trim() || null,
        // Silently dropped (not rejected) if it's not a real http(s) URL —
        // e.g. a javascript: URI shouldn't get stored and later rendered
        // as a clickable link. See sanitizeHttpUrl().
        linkedinUrl: sanitizeHttpUrl(row.linkedinUrl),
        notes: row.notes?.trim() || null,
      },
    });
    created.push(contact);
    if (emailKey) seenEmails.add(emailKey);
  }

  return NextResponse.json({
    contacts: created,
    createdCount: created.length,
    skippedDuplicate,
    skippedInvalid,
  });
}
