import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceFromToken } from "@/lib/tokens";
import { extensionContactSchema } from "@/lib/validation";
import { buildFullName } from "@/lib/contactName";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Called by the Chrome extension's background worker after it scrapes a
// LinkedIn profile page. Upserts by linkedinUrl so re-adding the same
// profile updates the existing contact instead of duplicating it.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const workspace = await resolveWorkspaceFromToken(token);

  if (!workspace) {
    return NextResponse.json(
      { error: "Invalid or missing API token" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = extensionContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const data = parsed.data;

  // Soft-deleted contacts are excluded from the dedupe match — re-saving a
  // profile that was archived creates a fresh contact rather than silently
  // reviving the old one.
  const existing = await prisma.contact.findFirst({
    where: { workspaceId: workspace.id, linkedinUrl: data.linkedinUrl, deletedAt: null },
  });

  // On update, deliberately leave firstName/lastName/fullName untouched —
  // the extension only ever scrapes one combined string, and re-scraping
  // an already-saved profile shouldn't silently undo a name the user split
  // into Nombre/Apellido by hand in the CRM.
  const contact = existing
    ? await prisma.contact.update({
        where: { id: existing.id },
        data: {
          headline: data.headline || existing.headline,
          company: data.company || existing.company,
          title: data.title || existing.title,
          location: data.location || existing.location,
          avatarUrl: data.avatarUrl || existing.avatarUrl,
        },
      })
    : await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          firstName: data.fullName,
          lastName: null,
          fullName: buildFullName(data.fullName, null),
          category: data.category ?? "INTERESTING",
          source: "LINKEDIN_EXTENSION",
          headline: data.headline || null,
          company: data.company || null,
          title: data.title || null,
          location: data.location || null,
          linkedinUrl: data.linkedinUrl,
          avatarUrl: data.avatarUrl || null,
          notes: data.notes || null,
        },
      });

  return NextResponse.json(
    { contact, created: !existing },
    { status: existing ? 200 : 201, headers: CORS_HEADERS }
  );
}
