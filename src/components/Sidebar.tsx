"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  KanbanSquare,
  Building2,
  Handshake,
  Users,
  Send,
  Settings,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/clients", label: "Clientes", icon: Building2 },
  { href: "/partners", label: "Partners", icon: Handshake },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/sequences", label: "Secuencias", icon: Send },
];

export function Sidebar({ workspaceName, email }: { workspaceName: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm font-semibold text-white">
          F
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">{workspaceName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 px-3 py-3">
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
            pathname?.startsWith("/settings")
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          }`}
        >
          <Settings size={17} />
          Ajustes
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2 px-3 py-1">
          <p className="truncate text-xs text-neutral-500" title={email}>
            {email}
          </p>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
