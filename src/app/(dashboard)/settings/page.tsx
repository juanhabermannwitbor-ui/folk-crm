import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { SettingsPanel } from "@/components/SettingsPanel";

export default async function SettingsPage() {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  const [tokens, stages] = await Promise.all([
    prisma.apiToken.findMany({
      where: { workspaceId: ctx.workspace.id },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pipelineStage.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <SettingsPanel
      workspaceName={ctx.workspace.name}
      initialTokens={JSON.parse(JSON.stringify(tokens))}
      initialStages={JSON.parse(JSON.stringify(stages))}
    />
  );
}
