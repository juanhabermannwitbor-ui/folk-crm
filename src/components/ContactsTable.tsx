"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2, ExternalLink, Clock } from "lucide-react";
import type { Contact, ContactCategory, PipelineStage } from "@/lib/types";
import { ContactFormModal } from "@/components/ContactFormModal";

function formatFollowUp(dateStr: string | null) {
  if (!dateStr) return null;
  // The date is stored as a bare calendar date (UTC midnight) with no
  // meaningful time-of-day — formatting/comparing in the viewer's local
  // timezone would shift it a day earlier for anyone west of UTC.
  const date = new Date(dateStr);
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const overdue = date < todayUtc;
  const label = date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return { label, overdue };
}

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
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este contacto?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <Plus size={15} /> Añadir
        </button>
      </header>

      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-2.5 top-2.5 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-lg border border-neutral-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-neutral-900"
          />
        </div>
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
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-neutral-900">{c.fullName}</p>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {[c.title, c.company].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      <div className="flex items-center gap-2">
                        <span>{c.email || c.phone || "—"}</span>
                        {c.linkedinUrl && (
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
                      {(() => {
                        const followUp = formatFollowUp(c.nextFollowUpAt);
                        if (!followUp) return <span className="text-neutral-400">—</span>;
                        return (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              followUp.overdue
                                ? "bg-red-50 text-red-600"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            <Clock size={11} />
                            {followUp.label}
                          </span>
                        );
                      })()}
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
        />
      )}
    </div>
  );
}
