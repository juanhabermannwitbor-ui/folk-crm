import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { ContactListsPage } from "@/components/ContactListsPage";

export default async function ListsPage() {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  const lists = await prisma.contactList.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ContactListsPage
      initialLists={lists.map((l) => ({
        id: l.id,
        name: l.name,
        createdAt: l.createdAt.toISOString(),
        memberCount: l._count.members,
      }))}
    />
  );
}
