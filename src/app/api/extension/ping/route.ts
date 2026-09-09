import { NextResponse, type NextRequest } from "next/server";
import { resolveWorkspaceFromToken } from "@/lib/tokens";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const workspace = await resolveWorkspaceFromToken(token);

  if (!workspace) {
    return NextResponse.json(
      { error: "Invalid or missing API token" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { workspace: { name: workspace.name } },
    { headers: CORS_HEADERS }
  );
}
