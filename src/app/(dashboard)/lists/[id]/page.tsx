import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { ContactListDetail } from "@/components/ContactListDetail";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const [list, allContacts] = await Promise.all([
    prisma.contactList.findUnique({
      where: { id },
      include: {
        members: {
          where: { contact: { deletedAt: null } },
          include: { contact: true },
          orderBy: { addedAt: "desc" },
        },
      },
    }),
    prisma.contact.findMany({
      where: { workspaceId: ctx.workspace.id, deletedAt: null },
      orderBy: { fullName: "asc" },
    }),
  ]);

  if (!list || list.workspaceId !== ctx.workspace.id) notFound();

  return (
    <ContactListDetail
      initialList={JSON.parse(
        JSON.stringify({
          id: list.id,
          name: list.name,
          createdAt: list.createdAt,
          members: list.members.map((m) => m.contact),
        })
      )}
      allContacts={JSON.parse(JSON.stringify(allContacts))}
    />
  );
}
