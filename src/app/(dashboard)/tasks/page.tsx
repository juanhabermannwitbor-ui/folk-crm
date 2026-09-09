import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { TaskList } from "@/components/TaskList";

export default async function TasksPage() {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  const [tasks, contacts] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { contact: { select: { id: true, fullName: true, category: true } } },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.contact.findMany({
      where: { workspaceId: ctx.workspace.id },
      select: { id: true, fullName: true, category: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <TaskList
      initialTasks={JSON.parse(JSON.stringify(tasks))}
      availableContacts={JSON.parse(JSON.stringify(contacts))}
    />
  );
}
