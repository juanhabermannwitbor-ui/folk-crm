import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireWorkspace();
  if (!ctx) redirect("/login");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar workspaceName={ctx.workspace.name} email={ctx.user.email ?? ""} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
