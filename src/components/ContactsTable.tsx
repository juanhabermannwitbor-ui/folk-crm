"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, ExternalLink, Upload, ListPlus } from "lucide-react";
import type { Contact, ContactCategory, ContactListSummary, PipelineStage } from "@/lib/types";
import { ContactFormModal } from "@/components/ContactFormModal";
import { FollowUpBadge } from "@/components/FollowUpBadge";
import { ImportContactsModal } from "@/components/ImportContactsModal";

export function ContactsTable({
  category,
  initialContacts,
  stages,
  title,
  description,
}: {
  category: ContactCategory;
  initialContacts: Contact[];
  stages: PipelineStage[];
  title: string;
  description: string;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddToList, setShowAddToList] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.fullName, c.company, c.title, c.email, c.location]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [contacts, query]);

  function handleSaved(contact: Contact) {
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === contact.id);
      if (contact.category !== category) return prev.filter((c) => c.id !== contact.id);
      return exists ? prev.map((c) => (c.id === contact.id ? contact : c)) : [contact, ...prev];
    });
    setEditing(null);
  }

  // From the Demand Signal panel — persists in place without closing the modal.
  function handleContactUpdate(contact: Contact) {
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? contact : c)));
  }

  function handleImported(imported: Contact[]) {
    if (imported.length > 0) setContacts((prev) => [...imported, ...prev]);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este contacto?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImporting(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Upload size={15} /> Importar
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Plus size={15} /> Añadir
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-2.5 top-2.5 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-lg border border-neutral-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{selected.size} seleccionado{selected.size === 1 ? "" : "s"}</span>
            <button
              onClick={() => setShowAddToList(true)}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <ListPlus size={14} /> Agregar a lista
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-700"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-neutral-400">
            <p className="text-sm">Todavía no hay nada aquí.</p>
            <button
              onClick={() => setCreating(true)}
              className="mt-2 text-sm font-medium text-neutral-700 underline underline-offset-2"
            >
              Añade el primero
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="w-8 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 accent-neutral-900"
                    />
                  </th>
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="px-4 py-2.5">Empresa / cargo</th>
                  <th className="px-4 py-2.5">Contacto</th>
                  <th className="px-4 py-2.5">Ubicación</th>
                  <th className="px-4 py-2.5">Seguimiento</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setEditing(c)}
                    className="cursor-pointer hover:bg-neutral-50"
                  >
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelected(c.id)}
                        className="h-4 w-4 accent-neutral-900"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-neutral-900">{c.fullName}</p>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {[c.title, c.company].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      <div className="flex items-center gap-2">
                        <span>{c.email || c.phone || "—"}</span>
                        {c.linkedinUrl && /^https?:\/\//i.test(c.linkedinUrl) && (
                          <a
                            href={c.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-neutral-400 hover:text-[#0a66c2]"
                            title="Abrir LinkedIn"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{c.location || "—"}</td>
                    <td className="px-4 py-2.5">
                      <FollowUpBadge dueDate={c.nextFollowUpAt} actionType={c.nextFollowUpAction} />
                      {!c.nextFollowUpAt && <span className="text-neutral-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c.id);
                        }}
                        className="rounded-md p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                        title="Eliminar"
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

      {(creating || editing) && (
        <ContactFormModal
          category={category}
          contact={editing ?? undefined}
          stages={stages}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
          onContactUpdate={handleContactUpdate}
        />
      )}

      {importing && (
        <ImportContactsModal
          category={category}
          onClose={() => setImporting(false)}
          onImported={handleImported}
        />
      )}

      {showAddToList && (
        <AddToListModal
          contactIds={[...selected]}
          onClose={() => setShowAddToList(false)}
          onAdded={() => {
            setShowAddToList(false);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}

function AddToListModal({
  contactIds,
  onClose,
  onAdded,
}: {
  contactIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [lists, setLists] = useState<ContactListSummary[] | null>(null);
  const [creatingName, setCreatingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lists")
      .then((res) => res.json())
      .then((body) => setLists(body.lists ?? []));
  }, []);

  async function addTo(listId: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/lists/${listId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("No se pudo agregar a la lista.");
      return;
    }
    onAdded();
  }

  async function createAndAdd() {
    const name = creatingName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setSaving(false);
      setError("No se pudo crear la lista.");
      return;
    }
    const { list } = await res.json();
    await addTo(list.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 className="mb-3 text-base font-semibold text-neutral-900">Agregar a lista</h2>

        {lists === null ? (
          <p className="text-sm text-neutral-400">Cargando listas...</p>
        ) : lists.length === 0 ? (
          <p className="mb-3 text-sm text-neutral-500">Todavía no tenés listas creadas.</p>
        ) : (
          <ul className="mb-3 max-h-48 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
            {lists.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => addTo(l.id)}
                  disabled={saving}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  <span className="text-neutral-800">{l.name}</span>
                  <span className="text-xs text-neutral-400">{l.memberCount}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <input
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
            placeholder="Nueva lista..."
            className="flex-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
          />
          <button
            onClick={createAndAdd}
            disabled={saving || !creatingName.trim()}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Crear
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-3 flex justify-end">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-500">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
