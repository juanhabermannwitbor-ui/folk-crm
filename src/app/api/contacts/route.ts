import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { createContactSchema, contactCategorySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categoryParam = request.nextUrl.searchParams.get("category");
  const category = categoryParam
    ? contactCategorySchema.safeParse(categoryParam).data
    : undefined;

  const contacts = await prisma.contact.findMany({
    where: { workspaceId: ctx.workspace.id, ...(category ? { category } : {}) },
    include: { pipelineStage: true },
    orderBy: [{ stageOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  let stageOrder = 0;
  if (data.category === "LEAD" && data.pipelineStageId) {
    const last = await prisma.contact.findFirst({
      where: { workspaceId: ctx.workspace.id, pipelineStageId: data.pipelineStageId },
      orderBy: { stageOrder: "desc" },
    });
    stageOrder = (last?.stageOrder ?? -1) + 1;
  }

  const contact = await prisma.contact.create({
    data: {
      workspaceId: ctx.workspace.id,
      fullName: data.fullName,
      category: data.category,
      headline: data.headline || null,
      company: data.company || null,
      title: data.title || null,
      location: data.location || null,
      email: data.email || null,
      phone: data.phone || null,
      linkedinUrl: data.linkedinUrl || null,
      avatarUrl: data.avatarUrl || null,
      notes: data.notes || null,
      tags: data.tags ?? [],
      pipelineStageId: data.category === "LEAD" ? data.pipelineStageId ?? null : null,
      dealValue: data.dealValue ?? null,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      stageOrder,
    },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
