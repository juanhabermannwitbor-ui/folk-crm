import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createSequenceSchema } from "@/lib/validation";

export async function GET() {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sequences = await prisma.sequence.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { _count: { select: { steps: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sequences });
}

export async function POST(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createSequenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sequence = await prisma.sequence.create({
    data: { workspaceId: ctx.workspace.id, name: parsed.data.name },
    include: { _count: { select: { steps: true, enrollments: true } } },
  });

  return NextResponse.json({ sequence }, { status: 201 });
}
