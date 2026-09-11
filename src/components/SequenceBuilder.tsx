"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  Eye,
  UserPlus,
  Sparkles,
  X,
  ListChecks,
} from "lucide-react";
import type {
  Contact,
  ContactListSummary,
  EnrollmentStatus,
  Sequence,
  SequenceStep,
} from "@/lib/types";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/types";
import { AiComposeModal } from "@/components/AiComposeModal";
import { SEQUENCE_MERGE_TOKENS as MERGE_TOKENS, renderSequenceTemplate as renderTemplate } from "@/lib/sequenceTemplate";

export function SequenceBuilder({
  initialSequence,
  availableContacts,
}: {
  initialSequence: Sequence;
  availableContacts: Contact[];
}) {
  const router = useRouter();
  const [sequence, setSequence] = useState(initialSequence);
  const [steps, setSteps] = useState(initialSequence.steps);
  const [enrollments, setEnrollments] = useState(initialSequence.enrollments);
  const [previewContactId, setPreviewContactId] = useState<string>(
    initialSequence.enrollments[0]?.contactId ?? availableContacts[0]?.id ?? ""
  );
  const [showEnrollPicker, setShowEnrollPicker] = useState(false);
  const [lists, setLists] = useState<ContactListSummary[] | null>(null);
  const [enrollingListId, setEnrollingListId] = useState("");
  const [bulkEnrolling, setBulkEnrolling] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  useEffect(() => {
    if (showEnrollPicker && lists === null) {
      fetch("/api/lists")
        .then((res) => res.json())
        .then((body) => setLists(body.lists ?? []));
    }
  }, [showEnrollPicker, lists]);

  const previewContact = useMemo(
    () =>
      availableContacts.find((c) => c.id === previewContactId) ??
      enrollments.find((e) => e.contactId === previewContactId)?.contact ??
      null,
    [previewContactId, availableContacts, enrollments]
  );

  const enrolledIds = new Set(enrollments.map((e) => e.contactId));
  const enrollableContacts = availableContacts.filter((c) => !enrolledIds.has(c.id));

  async function renameSequence(name: string) {
    setSequence((prev) => ({ ...prev, name }));
    await fetch(`/api/sequences/${sequence.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function addStep() {
    const res = await fetch(`/api/sequences/${sequence.id}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Asunto del correo",
        body: "Hola {{nombre}},\n\n",
        delayDays: steps.length === 0 ? 0 : 3,
      }),
    });
    if (!res.ok) return;
    const { step } = await res.json();
    setSteps((prev) => [...prev, step]);
  }

  async function updateStep(stepId: string, data: Partial<SequenceStep>) {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...data } : s)));
    await fetch(`/api/sequences/${sequence.id}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function deleteStep(stepId: string) {
    if (!confirm("¿Eliminar este paso de la secuencia?")) return;
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    await fetch(`/api/sequences/${sequence.id}/steps/${stepId}`, { method: "DELETE" });
  }

  async function enrollContact(contactId: string) {
    setShowEnrollPicker(false);
    const res = await fetch(`/api/sequences/${sequence.id}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    if (!res.ok) return;
    const { enrollment } = await res.json();
    setEnrollments((prev) => [enrollment, ...prev]);
  }

  async function enrollList() {
    if (!enrollingListId) return;
    setBulkEnrolling(true);
    setBulkResult(null);

    const listRes = await fetch(`/api/lists/${enrollingListId}`);
    if (!listRes.ok) {
      setBulkEnrolling(false);
      setBulkResult("No se pudo leer la lista.");
      return;
    }
    const { list } = await listRes.json();
    const contactIds: string[] = list.members.map((c: Contact) => c.id);

    if (contactIds.length === 0) {
      setBulkEnrolling(false);
      setBulkResult("Esa lista no tiene contactos.");
      return;
    }

    const res = await fetch(`/api/sequences/${sequence.id}/enrollments/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds }),
    });
    setBulkEnrolling(false);
    if (!res.ok) {
      setBulkResult("No se pudo inscribir la lista.");
      return;
    }
    const data = await res.json();
    setEnrollments((prev) => [...data.enrollments, ...prev]);
    setBulkResult(
      `Se inscribieron ${data.enrolledCount}${data.alreadyEnrolled > 0 ? ` (${data.alreadyEnrolled} ya estaban inscritos)` : ""}.`
    );
  }

  async function updateEnrollment(
    enrollmentId: string,
    data: { status?: EnrollmentStatus; currentStep?: number }
  ) {
    setEnrollments((prev) =>
      prev.map((e) => (e.id === enrollmentId ? { ...e, ...data } : e))
    );
    await fetch(`/api/sequences/${sequence.id}/enrollments/${enrollmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function removeEnrollment(enrollmentId: string) {
    setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    await fetch(`/api/sequences/${sequence.id}/enrollments/${enrollmentId}`, {
      method: "DELETE",
    });
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-6 py-4">
        <button
          onClick={() => router.push("/sequences")}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ArrowLeft size={17} />
        </button>
        <input
          defaultValue={sequence.name}
          onBlur={(e) => e.target.value.trim() && renameSequence(e.target.value.trim())}
          className="flex-1 rounded-md border border-transparent px-1.5 py-1 text-lg font-semibold text-neutral-900 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
        />
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 mx-6 mt-4 px-4 py-2.5 text-sm text-amber-800">
        Diseño únicamente por ahora — el envío automático se activa cuando conecten un dominio de
        correo verificado.
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden px-6 py-4">
        <div className="flex-1 overflow-y-auto pr-2">
          {(availableContacts.length > 0 || enrollments.length > 0) && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              <Eye size={14} className="text-neutral-400" />
              <span className="text-neutral-500">Previsualizar con:</span>
              <select
                value={previewContactId}
                onChange={(e) => setPreviewContactId(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
              >
                <option value="">— genérico —</option>
                {availableContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative pl-6">
            <div className="absolute left-[9px] top-3 bottom-3 w-px bg-neutral-200" />
            {steps.map((step, i) => (
              <div key={step.id} className="relative mb-4">
                {i > 0 && (
                  <div className="mb-2 flex items-center gap-1.5 pl-2 text-xs text-neutral-500">
                    <Clock size={12} />
                    esperar
                    <input
                      type="number"
                      min={0}
                      defaultValue={step.delayDays}
                      onBlur={(e) => updateStep(step.id, { delayDays: Number(e.target.value) })}
                      className="w-12 rounded border border-neutral-300 px-1 py-0.5 text-center text-xs"
                    />
                    días, luego:
                  </div>
                )}
                <span className="absolute -left-6 top-3 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
                <StepEditor
                  index={i}
                  step={step}
                  previewContact={previewContact}
                  onUpdate={(data) => updateStep(step.id, data)}
                  onDelete={() => deleteStep(step.id)}
                />
              </div>
            ))}
          </div>

          <button
            onClick={addStep}
            className="ml-0 flex items-center gap-1.5 rounded-xl border border-dashed border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
          >
            <Plus size={15} /> Añadir paso
          </button>
        </div>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-neutral-200 pl-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              Inscritos ({enrollments.length})
            </h2>
            <button
              onClick={() => setShowEnrollPicker((v) => !v)}
              className="flex items-center gap-1 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              title="Inscribir contacto"
            >
              <UserPlus size={15} />
            </button>
          </div>

          {showEnrollPicker && (
            <div className="mb-3 space-y-2 rounded-lg border border-neutral-200 bg-white p-2">
              {lists && lists.length > 0 && (
                <div className="flex items-center gap-1.5 border-b border-neutral-100 pb-2">
                  <ListChecks size={13} className="shrink-0 text-neutral-400" />
                  <select
                    value={enrollingListId}
                    onChange={(e) => setEnrollingListId(e.target.value)}
                    className="flex-1 rounded-md border border-neutral-300 px-1.5 py-1 text-xs"
                  >
                    <option value="">— elegir lista —</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.memberCount})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={enrollList}
                    disabled={!enrollingListId || bulkEnrolling}
                    className="shrink-0 rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {bulkEnrolling ? "..." : "Inscribir"}
                  </button>
                </div>
              )}
              {bulkResult && <p className="px-1 text-[11px] text-neutral-500">{bulkResult}</p>}

              {enrollableContacts.length === 0 ? (
                <p className="p-2 text-xs text-neutral-400">
                  No hay más contactos disponibles para inscribir.
                </p>
              ) : (
                <ul className="max-h-48 overflow-y-auto">
                  {enrollableContacts.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => enrollContact(c.id)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-50"
                      >
                        {c.fullName}
                        {c.company && <span className="text-neutral-400"> · {c.company}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {enrollments.length === 0 ? (
            <p className="text-sm text-neutral-400">Todavía no inscribiste a nadie.</p>
          ) : (
            <ul className="space-y-2">
              {enrollments.map((e) => (
                <li key={e.id} className="rounded-lg border border-neutral-200 bg-white p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {e.contact.fullName}
                      </p>
                      <p className="text-xs text-neutral-400">
                        Paso {Math.min(e.currentStep + 1, Math.max(steps.length, 1))} de{" "}
                        {steps.length || 1}
                      </p>
                    </div>
                    <button
                      onClick={() => removeEnrollment(e.id)}
                      className="shrink-0 rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <select
                    value={e.status}
                    onChange={(ev) =>
                      updateEnrollment(e.id, { status: ev.target.value as EnrollmentStatus })
                    }
                    className="mt-2 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  >
                    {Object.entries(ENROLLMENT_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function StepEditor({
  index,
  step,
  previewContact,
  onUpdate,
  onDelete,
}: {
  index: number;
  step: SequenceStep;
  previewContact: Contact | null;
  onUpdate: (data: Partial<SequenceStep>) => void;
  onDelete: () => void;
}) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");
  const [showAiModal, setShowAiModal] = useState(false);

  function applyAiResult(result: { subject?: string; body: string }) {
    if (subjectRef.current && result.subject) subjectRef.current.value = result.subject;
    if (bodyRef.current) bodyRef.current.value = result.body;
    onUpdate({ subject: result.subject ?? step.subject, body: result.body });
    setShowAiModal(false);
  }

  function insertToken(token: string) {
    const field = lastFocused.current;
    const el = field === "subject" ? subjectRef.current : bodyRef.current;
    if (!el) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const nextValue = el.value.slice(0, start) + token + el.value.slice(end);
    el.value = nextValue;
    el.focus();
    const cursor = start + token.length;
    el.setSelectionRange(cursor, cursor);

    onUpdate(field === "subject" ? { subject: nextValue } : { body: nextValue });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Paso {index + 1}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          >
            <Sparkles size={13} /> Generar con IA
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {MERGE_TOKENS.map((t) => (
          <button
            key={t.token}
            type="button"
            onClick={() => insertToken(t.token)}
            className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100"
            title={`Insertar ${t.token}`}
          >
            + {t.label}
          </button>
        ))}
      </div>

      <input
        ref={subjectRef}
        defaultValue={step.subject}
        onFocus={() => (lastFocused.current = "subject")}
        onBlur={(e) => onUpdate({ subject: e.target.value })}
        placeholder="Asunto"
        className="mb-2 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm font-medium outline-none focus:border-neutral-900"
      />
      <textarea
        ref={bodyRef}
        defaultValue={step.body}
        onFocus={() => (lastFocused.current = "body")}
        onBlur={(e) => onUpdate({ body: e.target.value })}
        rows={4}
        placeholder="Escribe el mensaje, o usa los botones de arriba para insertar variables."
        className="w-full resize-none rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
      />

      {previewContact && (
        <div className="mt-2 rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600">
          <p className="mb-1 font-medium text-neutral-400">Vista previa</p>
          <p className="font-medium text-neutral-700">{renderTemplate(step.subject, previewContact)}</p>
          <p className="whitespace-pre-wrap">{renderTemplate(step.body, previewContact)}</p>
        </div>
      )}

      {showAiModal && (
        <AiComposeModal
          defaultChannel="EMAIL"
          onClose={() => setShowAiModal(false)}
          onApply={applyAiResult}
        />
      )}
    </div>
  );
}
