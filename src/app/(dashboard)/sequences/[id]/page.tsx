import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { SequenceBuilder } from "@/components/SequenceBuilder";

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const [sequence, contacts] = await Promise.all([
    prisma.sequence.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: "asc" } },
        enrollments: { include: { contact: true }, orderBy: { enrolledAt: "desc" } },
      },
    }),
    prisma.contact.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { fullName: "asc" },
    }),
  ]);

  if (!sequence || sequence.workspaceId !== ctx.workspace.id) notFound();

  return (
    <SequenceBuilder
      initialSequence={JSON.parse(JSON.stringify(sequence))}
      availableContacts={JSON.parse(JSON.stringify(contacts))}
    />
  );
}
