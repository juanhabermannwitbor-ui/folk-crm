import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createListSchema } from "@/lib/validation";

export async function GET() {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lists = await prisma.contactList.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    lists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      createdAt: l.createdAt,
      memberCount: l._count.members,
    })),
  });
}

export async function POST(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const list = await prisma.contactList.create({
    data: { workspaceId: ctx.workspace.id, name: parsed.data.name },
  });

  return NextResponse.json(
    { list: { id: list.id, name: list.name, createdAt: list.createdAt, memberCount: 0 } },
    { status: 201 }
  );
}
