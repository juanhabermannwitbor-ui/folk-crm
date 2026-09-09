"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Users, ListOrdered } from "lucide-react";
import type { SequenceSummary } from "@/lib/types";

export function SequenceList({ initialSequences }: { initialSequences: SequenceSummary[] }) {
  const router = useRouter();
  const sequences = initialSequences;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const res = await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);
    if (!res.ok) return;
    const { sequence } = await res.json();
    router.push(`/sequences/${sequence.id}`);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Secuencias</h1>
          <p className="text-sm text-neutral-500">
            Diseña el flujo de mensajes y quién está inscrito en cada paso.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <Plus size={15} /> Nueva secuencia
        </button>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 mx-6 mt-4 px-4 py-2.5 text-sm text-amber-800">
        El envío real todavía no está conectado (falta un dominio de correo verificado). Por ahora
        puedes diseñar los pasos y ver quién quedaría inscrito.
      </div>

      <div className="flex-1 overflow-auto p-6">
        {creating && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nombre de la secuencia (ej. Outbound SDR)"
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

        {sequences.length === 0 && !creating ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-neutral-400">
            <Send size={28} className="mb-2 text-neutral-300" />
            <p className="text-sm">Todavía no armaste ninguna secuencia.</p>
            <button
              onClick={() => setCreating(true)}
              className="mt-2 text-sm font-medium text-neutral-700 underline underline-offset-2"
            >
              Crea la primera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sequences.map((seq) => (
              <button
                key={seq.id}
                onClick={() => router.push(`/sequences/${seq.id}`)}
                className="rounded-xl border border-neutral-200 bg-white p-4 text-left hover:border-neutral-300 hover:shadow-sm"
              >
                <p className="font-medium text-neutral-900">{seq.name}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <ListOrdered size={13} /> {seq._count.steps} paso{seq._count.steps === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {seq._count.enrollments} inscrito{seq._count.enrollments === 1 ? "" : "s"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
