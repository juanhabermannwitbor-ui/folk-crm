import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { composeMessageSchema } from "@/lib/validation";
import { composeMessage } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = composeMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let contact = null;
  if (parsed.data.contactId) {
    contact = await prisma.contact.findUnique({ where: { id: parsed.data.contactId } });
    if (!contact || contact.workspaceId !== ctx.workspace.id) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
  }

  try {
    const message = await composeMessage({ ...parsed.data, contact });
    return NextResponse.json({ message });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "No se pudo generar el mensaje.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
