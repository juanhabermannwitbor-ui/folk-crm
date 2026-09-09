import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { SequenceList } from "@/components/SequenceList";

export default async function SequencesPage() {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  const sequences = await prisma.sequence.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { _count: { select: { steps: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return <SequenceList initialSequences={JSON.parse(JSON.stringify(sequences))} />;
}
