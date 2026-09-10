"use client";

import { useState, type FormEvent } from "react";
import { CalendarPlus, Sparkles, X } from "lucide-react";
import type { Contact, ContactCategory, FollowUpAction, PipelineStage } from "@/lib/types";
import { CATEGORY_LABELS, FOLLOW_UP_ACTION_LABELS } from "@/lib/types";
import { AiComposeModal } from "@/components/AiComposeModal";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";
import { DemandSignalPanel } from "@/components/DemandSignalPanel";

type Props = {
  category: ContactCategory;
  contact?: Contact;
  stages?: PipelineStage[];
  defaultStageId?: string | null;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
  // Fired when the Demand Signal panel saves a score/signal change — unlike
  // onSaved, it must NOT close the modal, since the user keeps editing.
  onContactUpdate?: (contact: Contact) => void;
};

export function ContactFormModal({
  category,
  contact,
  stages,
  defaultStageId,
  onClose,
  onSaved,
  onContactUpdate,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory>(category);
  const [fullName, setFullName] = useState(contact?.fullName ?? "");
  const [title, setTitle] = useState(contact?.title ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [location, setLocation] = useState(contact?.location ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedinUrl ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [dealValue, setDealValue] = useState(contact?.dealValue?.toString() ?? "");
  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    contact?.nextFollowUpAt ? contact.nextFollowUpAt.slice(0, 10) : ""
  );
  const [nextFollowUpAction, setNextFollowUpAction] = useState<FollowUpAction | "">(
    contact?.nextFollowUpAction ?? ""
  );
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [pipelineStageId, setPipelineStageId] = useState(
    contact?.pipelineStageId ?? defaultStageId ?? stages?.[0]?.id ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      fullName,
      category: selectedCategory,
      title: title || null,
      company: company || null,
      location: location || null,
      email: email || null,
      phone: phone || null,
      linkedinUrl: linkedinUrl || null,
      notes: notes || null,
      dealValue: dealValue ? Number(dealValue) : null,
      nextFollowUpAt: nextFollowUpAt || null,
      nextFollowUpAction: nextFollowUpAt ? nextFollowUpAction || null : null,
      ...(selectedCategory === "LEAD"
        ? { pipelineStageId: pipelineStageId || stages?.[0]?.id || null }
        : {}),
    };

    const res = await fetch(contact ? `/api/contacts/${contact.id}` : "/api/contacts", {
      method: contact ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "No se pudo guardar el contacto.");
      return;
    }

    const { contact: saved } = await res.json();
    onSaved(saved);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">
            {contact ? "Editar contacto" : "Nuevo contacto"}
          </h2>
          <div className="flex items-center gap-1">
            {contact && (
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              >
                <Sparkles size={13} /> Redactar mensaje
              </button>
            )}
            <button onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre completo *">
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Tipo">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ContactCategory)}
                className="input"
              >
                {(Object.keys(CATEGORY_LABELS) as ContactCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
            </Field>
            <Field label="Empresa">
              <input value={company} onChange={(e) => setCompany(e.target.value)} className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Teléfono">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ubicación">
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="input" />
            </Field>
            <Field label="LinkedIn">
              <input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="input"
              />
            </Field>
          </div>

          {selectedCategory === "LEAD" && stages && stages.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fase del pipeline">
                <select
                  value={pipelineStageId}
                  onChange={(e) => setPipelineStageId(e.target.value)}
                  className="input"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Valor potencial (€)">
                <input
                  type="number"
                  min={0}
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Próximo seguimiento">
              <input
                type="date"
                value={nextFollowUpAt}
                onChange={(e) => setNextFollowUpAt(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Acción">
              <select
                value={nextFollowUpAction}
                onChange={(e) => setNextFollowUpAction(e.target.value as FollowUpAction | "")}
                disabled={!nextFollowUpAt}
                className="input disabled:opacity-50"
              >
                <option value="">— sin especificar —</option>
                {(Object.keys(FOLLOW_UP_ACTION_LABELS) as FollowUpAction[]).map((a) => (
                  <option key={a} value={a}>
                    {FOLLOW_UP_ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {nextFollowUpAction === "MEETING" && nextFollowUpAt && (
            <div className="flex items-end gap-3 rounded-lg bg-neutral-50 p-3">
              <Field label="Hora">
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="input"
                />
              </Field>
              <a
                href={buildGoogleCalendarUrl({
                  title: `Reunión con ${fullName || "contacto"}`,
                  details: [title, company].filter(Boolean).join(" · ") || undefined,
                  date: nextFollowUpAt,
                  time: meetingTime,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-[1px] flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <CalendarPlus size={14} /> Agendar en Google Calendar
              </a>
            </div>
          )}

          <Field label="Notas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input resize-none"
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>

        {contact && (
          <div className="mt-4">
            <DemandSignalPanel
              key={contact.id}
              contact={contact}
              onContactUpdate={(updated) => onContactUpdate?.(updated)}
            />
          </div>
        )}
      </div>

      {showAiModal && contact && (
        <AiComposeModal contactId={contact.id} onClose={() => setShowAiModal(false)} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  );
}
