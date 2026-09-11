"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Search, X, Upload, Download } from "lucide-react";
import type { Contact, ContactListDetail as ContactListDetailType } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { ImportContactsModal } from "@/components/ImportContactsModal";
import { exportContactsToFile } from "@/lib/importContacts";

export function ContactListDetail({
  initialList,
  allContacts,
}: {
  initialList: ContactListDetailType;
  allContacts: Contact[];
}) {
  const router = useRouter();
  const [list, setList] = useState(initialList);
  const [showPicker, setShowPicker] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const candidateContacts = useMemo(() => {
    const memberIds = new Set(list.members.map((c) => c.id));
    return allContacts.filter((c) => !memberIds.has(c.id));
  }, [allContacts, list.members]);

  async function renameList(name: string) {
    setList((prev) => ({ ...prev, name }));
    await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function addContacts(contactIds: string[]) {
    setShowPicker(false);
    const res = await fetch(`/api/lists/${list.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds }),
    });
    if (!res.ok) return;
    const added = allContacts.filter((c) => contactIds.includes(c.id));
    setList((prev) => ({ ...prev, members: [...added, ...prev.members] }));
  }

  async function removeContact(contactId: string) {
    setList((prev) => ({ ...prev, members: prev.members.filter((c) => c.id !== contactId) }));
    await fetch(`/api/lists/${list.id}/members/${contactId}`, { method: "DELETE" });
  }

  function handleImported(imported: Contact[]) {
    if (imported.length === 0) return;
    setList((prev) => {
      const existingIds = new Set(prev.members.map((c) => c.id));
      const newOnes = imported.filter((c) => !existingIds.has(c.id));
      return { ...prev, members: [...newOnes, ...prev.members] };
    });
  }

  async function handleExport(format: "csv" | "xlsx") {
    setShowExportMenu(false);
    setExporting(true);
    const slug = list.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await exportContactsToFile(list.members, format, `lista-${slug || "contactos"}`);
    setExporting(false);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-6 py-4">
        <button
          onClick={() => router.push("/lists")}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ArrowLeft size={17} />
        </button>
        <input
          defaultValue={list.name}
          onBlur={(e) => e.target.value.trim() && renameList(e.target.value.trim())}
          className="flex-1 rounded-md border border-transparent px-1.5 py-1 text-lg font-semibold text-neutral-900 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Upload size={15} /> Importar
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={list.members.length === 0 || exporting}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              <Download size={15} /> {exporting ? "Exportando..." : "Exportar"}
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                  <button
                    onClick={() => handleExport("csv")}
                    className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Como CSV
                  </button>
                  <button
                    onClick={() => handleExport("xlsx")}
                    className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Como Excel (.xlsx)
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Plus size={15} /> Agregar contactos
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {list.members.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-neutral-400">
            <p className="text-sm">Esta lista todavía no tiene contactos.</p>
            <button
              onClick={() => setShowPicker(true)}
              className="mt-2 text-sm font-medium text-neutral-700 underline underline-offset-2"
            >
              Agregar contactos
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="px-4 py-2.5">Tipo</th>
                  <th className="px-4 py-2.5">Empresa / cargo</th>
                  <th className="px-4 py-2.5">Contacto</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {list.members.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5 font-medium text-neutral-900">{c.fullName}</td>
                    <td className="px-4 py-2.5 text-neutral-600">{CATEGORY_LABELS[c.category]}</td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {[c.title, c.company].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{c.email || c.phone || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => removeContact(c.id)}
                        title="Quitar de la lista"
                        className="rounded-md p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPicker && (
        <ContactPickerModal
          candidates={candidateContacts}
          onCancel={() => setShowPicker(false)}
          onConfirm={addContacts}
        />
      )}

      {showImport && (
        <ImportContactsModal
          listId={list.id}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
}

function ContactPickerModal({
  candidates,
  onCancel,
  onConfirm,
}: {
  candidates: Contact[];
  onCancel: () => void;
  onConfirm: (contactIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      [c.fullName, c.company, c.email].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    );
  }, [candidates, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Agregar contactos</h2>
          <button onClick={onCancel} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-2">
          <Search size={15} className="absolute left-2.5 top-2.5 text-neutral-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, empresa o email..."
            className="w-full rounded-lg border border-neutral-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-200">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-neutral-400">No hay contactos disponibles.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {filtered.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 shrink-0 accent-neutral-900"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-neutral-800">{c.fullName}</p>
                      {c.company && <p className="truncate text-xs text-neutral-400">{c.company}</p>}
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm([...selected])}
            disabled={selected.size === 0}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Agregar {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
