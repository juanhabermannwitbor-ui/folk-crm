import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { ContactsTable } from "@/components/ContactsTable";

export default async function ClientsPage() {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  const [contacts, stages] = await Promise.all([
    prisma.contact.findMany({
      where: { workspaceId: ctx.workspace.id, category: "CLIENT" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pipelineStage.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { order: "asc" } }),
  ]);

  return (
    <ContactsTable
      category="CLIENT"
      initialContacts={JSON.parse(JSON.stringify(contacts))}
      stages={JSON.parse(JSON.stringify(stages))}
      title="Clientes"
      description="Cuentas activas y su información de contacto."
    />
  );
}
