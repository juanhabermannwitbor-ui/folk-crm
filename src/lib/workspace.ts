import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// Every Supabase auth user gets exactly one workspace, created lazily on
// first visit. Keeping this 1:1 for now is simpler than building
// invitations; multi-seat sharing can extend WorkspaceMember later.
export async function getOrCreateWorkspaceForUser(user: User) {
  const existing = await prisma.workspaceMember.findUnique({
    where: { userId: user.id },
    include: { workspace: true },
  });
  if (existing) return existing.workspace;

  try {
    return await prisma.workspace.create({
      data: {
        name: user.email ? `${user.email.split("@")[0]}'s workspace` : "My workspace",
        members: {
          create: { userId: user.id, email: user.email ?? "", role: "owner" },
        },
        pipelineStages: {
          create: [
            { name: "New", order: 0, color: "#64748b" },
            { name: "Contacted", order: 1, color: "#6366f1" },
            { name: "Meeting", order: 2, color: "#f59e0b" },
            { name: "Proposal", order: 3, color: "#0ea5e9" },
            { name: "Won", order: 4, color: "#22c55e" },
          ],
        },
      },
    });
  } catch (err) {
    // The dashboard layout and page both resolve the workspace for a fresh
    // user in parallel; the loser of that race hits the WorkspaceMember
    // unique constraint here instead of finding a row above. Whoever wins
    // has already committed a workspace, so just fetch it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const created = await prisma.workspaceMember.findUnique({
        where: { userId: user.id },
        include: { workspace: true },
      });
      if (created) return created.workspace;
    }
    throw err;
  }
}

// Convenience wrapper for Server Components / Route Handlers: resolves the
// logged-in Supabase user and their workspace in one call, or null if
// unauthenticated.
export async function requireWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const workspace = await getOrCreateWorkspaceForUser(user);
  return { user, workspace };
}
