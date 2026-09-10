import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { PipelineBoard } from "@/components/PipelineBoard";

export default async function PipelinePage() {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  const [stages, contacts] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { order: "asc" },
    }),
    prisma.contact.findMany({
      where: { workspaceId: ctx.workspace.id, category: "LEAD", deletedAt: null },
      orderBy: { stageOrder: "asc" },
    }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Pipeline</h1>
          <p className="text-sm text-neutral-500">
            Arrastra un lead entre columnas para mover su fase.
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <PipelineBoard
          initialStages={JSON.parse(JSON.stringify(stages))}
          initialContacts={JSON.parse(JSON.stringify(contacts))}
        />
      </div>
    </div>
  );
}
