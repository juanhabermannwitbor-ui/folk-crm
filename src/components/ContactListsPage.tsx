"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ListChecks, Users, Trash2 } from "lucide-react";
import type { ContactListSummary } from "@/lib/types";

export function ContactListsPage({ initialLists }: { initialLists: ContactListSummary[] }) {
  const router = useRouter();
  const [lists, setLists] = useState(initialLists);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);
    if (!res.ok) return;
    const { list } = await res.json();
    router.push(`/lists/${list.id}`);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta lista? Los contactos no se borran, solo la lista.")) return;
    setLists((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/lists/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Listas</h1>
          <p className="text-sm text-neutral-500">
            Agrupa contactos para inscribirlos juntos en una secuencia.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <Plus size={15} /> Nueva lista
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {creating && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nombre de la lista (ej. Prospectos Fintech Q3)"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear"}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-500"
            >
              Cancelar
            </button>
          </div>
        )}

        {lists.length === 0 && !creating ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-neutral-400">
            <ListChecks size={28} className="mb-2 text-neutral-300" />
            <p className="text-sm">Todavía no creaste ninguna lista.</p>
            <button
              onClick={() => setCreating(true)}
              className="mt-2 text-sm font-medium text-neutral-700 underline underline-offset-2"
            >
              Crea la primera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <div
                key={list.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/lists/${list.id}`)}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/lists/${list.id}`)}
                className="group relative cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 text-left hover:border-neutral-300 hover:shadow-sm"
              >
                <p className="pr-6 font-medium text-neutral-900">{list.name}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-neutral-500">
                  <Users size={13} />
                  {list.memberCount} contacto{list.memberCount === 1 ? "" : "s"}
                </div>
                <button
                  onClick={(e) => handleDelete(list.id, e)}
                  className="absolute right-3 top-3 rounded p-1 text-neutral-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
