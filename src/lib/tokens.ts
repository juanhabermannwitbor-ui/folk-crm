import "server-only";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const PREFIX = "folk_live_";

export function generateApiToken() {
  const raw = PREFIX + randomBytes(24).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Looks up the workspace that owns a bearer token sent by the Chrome
// extension. Returns null for a missing/invalid/unknown token.
export async function resolveWorkspaceFromToken(bearerToken: string | null) {
  if (!bearerToken || !bearerToken.startsWith(PREFIX)) return null;

  const hash = hashToken(bearerToken);
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hash },
    include: { workspace: true },
  });
  if (!token) return null;

  await prisma.apiToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  });

  return token.workspace;
}
