import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createSignalSchema } from "@/lib/validation";

async function loadOwnedContact(workspaceId: string, id: string) {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.workspaceId !== workspaceId) return null;
  return contact;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const contact = await loadOwnedContact(ctx.workspace.id, id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signals = await prisma.signal.findMany({
    where: { contactId: id },
    orderBy: { detectedAt: "desc" },
  });

  return NextResponse.json({ signals });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const contact = await loadOwnedContact(ctx.workspace.id, id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = createSignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const signal = await prisma.signal.create({
    data: {
      workspaceId: ctx.workspace.id,
      contactId: id,
      type: data.type,
      description: data.description,
      source: data.source || null,
      confidence: data.confidence,
      detectedAt: new Date(data.detectedAt),
    },
  });

  return NextResponse.json({ signal }, { status: 201 });
}
