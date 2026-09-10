"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Contact, NextBestAction, Signal, SignalConfidence, SignalType } from "@/lib/types";
import {
  NEXT_BEST_ACTION_LABELS,
  SIGNAL_CONFIDENCE_LABELS,
  SIGNAL_TYPE_LABELS,
} from "@/lib/types";
import {
  classifyDemandScore,
  computeDemandSignalScore,
  COMPANY_SIGNAL_SCALE_LABELS,
  CONTACT_SIGNAL_SCALE_LABELS,
  FIT_SCALE_LABELS,
  PRIORITY_LABELS,
  suggestTimingScore,
  TIMING_SCALE_LABELS,
  TOTAL_MAX,
  type DemandPriority,
} from "@/lib/scoring";

const PRIORITY_STYLES: Record<DemandPriority, string> = {
  LOW: "bg-neutral-100 text-neutral-600",
  MONITOR: "bg-sky-50 text-sky-700",
  HIGH: "bg-amber-50 text-amber-700",
  HOT: "bg-red-50 text-red-600",
};

const CONFIDENCE_DOT: Record<SignalConfidence, string> = {
  HIGH: "bg-emerald-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-neutral-300",
};

type ScoreField = "fitScore" | "companySignalScore" | "contactSignalScore" | "timingScore";

const DIMENSIONS: { field: ScoreField; label: string; scale: Record<number, string> }[] = [
  { field: "fitScore", label: "Fit", scale: FIT_SCALE_LABELS },
  { field: "companySignalScore", label: "Company Signal", scale: COMPANY_SIGNAL_SCALE_LABELS },
  { field: "contactSignalScore", label: "Contact Signal", scale: CONTACT_SIGNAL_SCALE_LABELS },
  { field: "timingScore", label: "Timing", scale: TIMING_SCALE_LABELS },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DemandSignalPanel({
  contact,
  onContactUpdate,
}: {
  contact: Contact;
  onContactUpdate: (contact: Contact) => void;
}) {
  const [scores, setScores] = useState<Record<ScoreField, number>>({
    fitScore: contact.fitScore,
    companySignalScore: contact.companySignalScore,
    contactSignalScore: contact.contactSignalScore,
    timingScore: contact.timingScore,
  });
  const [whyNow, setWhyNow] = useState(contact.whyNow ?? "");
  const [nextBestAction, setNextBestAction] = useState<NextBestAction | "">(
    contact.nextBestAction ?? ""
  );
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [showSignalForm, setShowSignalForm] = useState(false);
  const [editingSignalId, setEditingSignalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/contacts/${contact.id}/signals`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setSignals(body.signals ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoadingSignals(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contact.id]);

  const total = computeDemandSignalScore(scores);
  const priority = classifyDemandScore(total);
  const mostRecentSignalDate = signals[0]?.detectedAt ?? null; // API sorts by detectedAt desc
  const suggestedTiming = suggestTimingScore(mostRecentSignalDate);

  async function patchContact(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("No se pudo guardar el cambio.");
      return;
    }
    const { contact: updated } = await res.json();
    onContactUpdate(updated);
  }

  function handleScoreChange(field: ScoreField, value: number) {
    setScores((prev) => ({ ...prev, [field]: value }));
    patchContact({ [field]: value });
  }

  function handleWhyNowBlur() {
    if (whyNow === (contact.whyNow ?? "")) return;
    patchContact({ whyNow: whyNow || null });
  }

  function handleNextBestActionChange(value: NextBestAction | "") {
    setNextBestAction(value);
    patchContact({ nextBestAction: value || null });
  }

  async function handleDeleteSignal(signalId: string) {
    setSignals((prev) => prev.filter((s) => s.id !== signalId));
    await fetch(`/api/contacts/${contact.id}/signals/${signalId}`, { method: "DELETE" });
  }

  function handleSignalSaved(signal: Signal) {
    setSignals((prev) => {
      const exists = prev.some((s) => s.id === signal.id);
      const next = exists ? prev.map((s) => (s.id === signal.id ? signal : s)) : [signal, ...prev];
      return [...next].sort(
        (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
      );
    });
    setShowSignalForm(false);
    setEditingSignalId(null);
  }

  const editingSignal = signals.find((s) => s.id === editingSignalId) ?? null;

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Demand Signal Score
          </p>
          <p className="text-2xl font-semibold text-neutral-900">
            {total} <span className="text-sm font-normal text-neutral-400">/ {TOTAL_MAX}</span>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLES[priority]}`}>
          {PRIORITY_LABELS[priority]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DIMENSIONS.map((d) => (
          <label key={d.field} className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">{d.label}</span>
            <select
              value={scores[d.field]}
              onChange={(e) => handleScoreChange(d.field, Number(e.target.value))}
              className="input"
            >
              {Object.entries(d.scale).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {d.field === "timingScore" &&
              suggestedTiming !== null &&
              suggestedTiming !== scores.timingScore && (
                <button
                  type="button"
                  onClick={() => handleScoreChange("timingScore", suggestedTiming)}
                  className="mt-1 text-left text-[11px] font-medium text-neutral-400 hover:text-neutral-700"
                >
                  Sugerido según la señal más reciente: {suggestedTiming} · usar
                </button>
              )}
          </label>
        ))}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-700">Signals</p>
          <button
            type="button"
            onClick={() => {
              setEditingSignalId(null);
              setShowSignalForm((v) => !v);
            }}
            className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            <Plus size={13} /> Agregar señal
          </button>
        </div>

        {showSignalForm && (
          <SignalForm
            key={editingSignal?.id ?? "new"}
            contactId={contact.id}
            signal={editingSignal}
            onSaved={handleSignalSaved}
            onCancel={() => {
              setShowSignalForm(false);
              setEditingSignalId(null);
            }}
          />
        )}

        {loadingSignals ? (
          <p className="text-xs text-neutral-400">Cargando señales...</p>
        ) : signals.length === 0 && !showSignalForm ? (
          <p className="text-xs text-neutral-400">Todavía no hay señales cargadas.</p>
        ) : (
          <ul className="space-y-1.5">
            {signals.map((s) => (
              <li key={s.id} className="flex items-start gap-2 rounded-lg border border-neutral-200 px-2.5 py-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CONFIDENCE_DOT[s.confidence]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-800">{s.description}</p>
                  <p className="text-[11px] text-neutral-400">
                    {SIGNAL_TYPE_LABELS[s.type]} · {formatDate(s.detectedAt)}
                    {s.source ? ` · ${s.source}` : ""} · confianza {SIGNAL_CONFIDENCE_LABELS[s.confidence]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSignalId(s.id);
                    setShowSignalForm(true);
                  }}
                  className="shrink-0 rounded p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSignal(s.id)}
                  className="shrink-0 rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Why Now</span>
        <textarea
          value={whyNow}
          onChange={(e) => setWhyNow(e.target.value)}
          onBlur={handleWhyNowBlur}
          rows={2}
          placeholder="Ej: Nuevo Head of CX + expansión regional + contratación de soporte."
          className="input resize-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Next Best Action</span>
        <select
          value={nextBestAction}
          onChange={(e) => handleNextBestActionChange(e.target.value as NextBestAction | "")}
          className="input"
        >
          <option value="">— sin especificar —</option>
          {(Object.keys(NEXT_BEST_ACTION_LABELS) as NextBestAction[]).map((a) => (
            <option key={a} value={a}>
              {NEXT_BEST_ACTION_LABELS[a]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function SignalForm({
  contactId,
  signal,
  onSaved,
  onCancel,
}: {
  contactId: string;
  signal: Signal | null;
  onSaved: (signal: Signal) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<SignalType>(signal?.type ?? "COMPANY");
  const [description, setDescription] = useState(signal?.description ?? "");
  const [source, setSource] = useState(signal?.source ?? "");
  const [confidence, setConfidence] = useState<SignalConfidence>(signal?.confidence ?? "MEDIUM");
  const [detectedAt, setDetectedAt] = useState(
    signal?.detectedAt ? signal.detectedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!description.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      type,
      description: description.trim(),
      source: source.trim() || null,
      confidence,
      detectedAt,
    };
    const res = await fetch(
      signal ? `/api/contacts/${contactId}/signals/${signal.id}` : `/api/contacts/${contactId}/signals`,
      {
        method: signal ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      setError("No se pudo guardar la señal.");
      return;
    }
    const { signal: saved } = await res.json();
    onSaved(saved);
  }

  return (
    <div className="mb-2 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as SignalType)} className="input">
          {(Object.keys(SIGNAL_TYPE_LABELS) as SignalType[]).map((t) => (
            <option key={t} value={t}>
              {SIGNAL_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={confidence}
          onChange={(e) => setConfidence(e.target.value as SignalConfidence)}
          className="input"
        >
          {(Object.keys(SIGNAL_CONFIDENCE_LABELS) as SignalConfidence[]).map((c) => (
            <option key={c} value={c}>
              Confianza {SIGNAL_CONFIDENCE_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ej: Empresa abrió operaciones en Chile."
        className="input"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Fuente (opcional)"
          className="input"
        />
        <input type="date" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} className="input" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-500"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : signal ? "Guardar cambios" : "Agregar"}
        </button>
      </div>
    </div>
  );
}
