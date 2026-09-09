import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { generateApiToken } from "@/lib/tokens";
import { z } from "zod";

export async function GET() {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await prisma.apiToken.findMany({
    where: { workspaceId: ctx.workspace.id },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tokens });
}

const createTokenSchema = z.object({ name: z.string().trim().min(1).max(60).optional() });

export async function POST(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { raw, hash } = generateApiToken();
  const token = await prisma.apiToken.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name ?? "Chrome extension",
      tokenHash: hash,
    },
  });

  // The raw token is only ever shown here, right after creation.
  return NextResponse.json({ token: { id: token.id, name: token.name, raw } }, { status: 201 });
}
