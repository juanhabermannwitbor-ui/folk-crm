import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { ContactsTable } from "@/components/ContactsTable";

export default async function PartnersPage() {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  const [contacts, stages] = await Promise.all([
    prisma.contact.findMany({
      where: { workspaceId: ctx.workspace.id, category: "PARTNER", deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pipelineStage.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { order: "asc" } }),
  ]);

  return (
    <ContactsTable
      category="PARTNER"
      initialContacts={JSON.parse(JSON.stringify(contacts))}
      stages={JSON.parse(JSON.stringify(stages))}
      title="Partners"
      description="Colaboradores y aliados estratégicos."
    />
  );
}
