"use client";

import { useState } from "react";
import { Copy, Check, Trash2, ArrowUp, ArrowDown, KeyRound, RotateCcw, Radar, Send } from "lucide-react";
import type { ContactCategory, PipelineStage } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

type ApiTokenSummary = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type ArchivedContact = {
  id: string;
  fullName: string;
  company: string | null;
  category: ContactCategory;
  deletedAt: string;
};

type HiringScanResult = {
  companiesChecked: number;
  companiesWithJobs: number;
  signalsCreated: number;
  details: { company: string; jobsFound: number; signalsCreated: number }[];
};

type DispatchResult = {
  dueToday: number;
  dailyCap: number;
  sent: number;
  skippedNoEmail: number;
  failed: number;
  details: { contact: string; step: number; result: string }[];
};

export function SettingsPanel({
  workspaceName,
  initialTokens,
  initialStages,
  initialArchivedContacts,
}: {
  workspaceName: string;
  initialTokens: ApiTokenSummary[];
  initialStages: PipelineStage[];
  initialArchivedContacts: ArchivedContact[];
}) {
  const [tokens, setTokens] = useState(initialTokens);
  const [stages, setStages] = useState(initialStages);
  const [archivedContacts, setArchivedContacts] = useState(initialArchivedContacts);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<HiringScanResult | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | { error: string } | null>(null);
  const appUrl =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL;

  async function createToken() {
    const res = await fetch("/api/tokens", { method: "POST" });
    if (!res.ok) return;
    const { token } = await res.json();
    setRawToken(token.raw);
    setTokens((prev) => [{ id: token.id, name: token.name, createdAt: new Date().toISOString(), lastUsedAt: null }, ...prev]);
  }

  async function revokeToken(id: string) {
    if (!confirm("¿Revocar este token? La extensión que lo use dejará de funcionar.")) return;
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (res.ok) setTokens((prev) => prev.filter((t) => t.id !== id));
  }

  async function copyToken() {
    if (!rawToken) return;
    await navigator.clipboard.writeText(rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function renameStage(id: string, name: string) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    await fetch(`/api/stages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function deleteStage(id: string) {
    if (stages.length <= 1) return alert("Necesitas al menos una fase.");
    if (!confirm("Los leads de esta fase quedarán sin fase asignada. ¿Continuar?")) return;
    const res = await fetch(`/api/stages/${id}`, { method: "DELETE" });
    if (res.ok) setStages((prev) => prev.filter((s) => s.id !== id));
  }

  async function restoreContact(id: string) {
    const res = await fetch(`/api/contacts/${id}/restore`, { method: "POST" });
    if (res.ok) setArchivedContacts((prev) => prev.filter((c) => c.id !== id));
  }

  async function deleteContactPermanently(id: string) {
    if (!confirm("Esta acción no se puede deshacer. ¿Eliminar el contacto para siempre?")) return;
    const res = await fetch(`/api/contacts/${id}?permanent=true`, { method: "DELETE" });
    if (res.ok) setArchivedContacts((prev) => prev.filter((c) => c.id !== id));
  }

  async function runHiringScan() {
    setScanning(true);
    setScanResult(null);
    const res = await fetch("/api/signals/hiring-scan", { method: "POST" });
    setScanning(false);
    if (!res.ok) return;
    setScanResult(await res.json());
  }

  async function runSequenceDispatch() {
    setDispatching(true);
    setDispatchResult(null);
    const res = await fetch("/api/sequences/dispatch", { method: "POST" });
    const body = await res.json();
    setDispatching(false);
    setDispatchResult(res.ok ? body : { error: body.error ?? "No se pudo procesar el envío." });
  }

  async function moveStage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const next = [...stages];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setStages(next);

    await fetch("/api/stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: next.map((s, i) => ({ id: s.id, order: i })) }),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-lg font-semibold text-neutral-900">Ajustes</h1>
      <p className="mt-1 text-sm text-neutral-500">Workspace: {workspaceName}</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-900">Extensión de Chrome</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Genera un token, ábrelo en la extensión (icono → Configurar) junto con la URL{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">{appUrl}</code> y ya podrás
          guardar perfiles de LinkedIn con un clic.
        </p>

        {rawToken && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">
              Copia este token ahora — no volverá a mostrarse.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-white px-2 py-1.5 text-xs">{rawToken}</code>
              <button
                onClick={copyToken}
                className="flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-neutral-200 bg-white">
          {tokens.length === 0 ? (
            <div className="flex items-center justify-between p-4">
              <p className="text-sm text-neutral-500">Todavía no has creado ningún token.</p>
              <button
                onClick={createToken}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                <KeyRound size={14} /> Generar token
              </button>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-neutral-100">
                {tokens.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{t.name}</p>
                      <p className="text-xs text-neutral-400">
                        Creado {new Date(t.createdAt).toLocaleDateString("es-ES")}
                        {t.lastUsedAt
                          ? ` · último uso ${new Date(t.lastUsedAt).toLocaleDateString("es-ES")}`
                          : " · sin usar"}
                      </p>
                    </div>
                    <button
                      onClick={() => revokeToken(t.id)}
                      className="rounded-md p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-neutral-100 p-3">
                <button
                  onClick={createToken}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <KeyRound size={14} /> Generar otro token
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-900">Fases del pipeline</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Estas son las columnas del tablero de leads.
        </p>

        <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {stages.map((stage, i) => (
            <li key={stage.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
              <input
                defaultValue={stage.name}
                onBlur={(e) => e.target.value.trim() && renameStage(stage.id, e.target.value.trim())}
                className="flex-1 rounded-md border border-transparent px-1.5 py-0.5 text-sm text-neutral-800 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
              />
              <button
                onClick={() => moveStage(i, -1)}
                disabled={i === 0}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={() => moveStage(i, 1)}
                disabled={i === stages.length - 1}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={() => deleteStage(stage.id)}
                className="rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-900">Papelera</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Contactos eliminados desde las tablas. Podés restaurarlos o borrarlos para siempre.
        </p>

        {archivedContacts.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No hay contactos archivados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {archivedContacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">{c.fullName}</p>
                  <p className="truncate text-xs text-neutral-400">
                    {CATEGORY_LABELS[c.category]}
                    {c.company ? ` · ${c.company}` : ""} · eliminado el{" "}
                    {new Date(c.deletedAt).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => restoreContact(c.id)}
                    title="Restaurar"
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                  >
                    <RotateCcw size={13} /> Restaurar
                  </button>
                  <button
                    onClick={() => deleteContactPermanently(c.id)}
                    title="Eliminar para siempre"
                    className="rounded-md p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-900">Señales de contratación (piloto)</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Busca vacantes públicas abiertas (Greenhouse/Lever) para la empresa de cada contacto y
          carga una señal de tipo Contratación cuando encuentra algo. Es de mejor esfuerzo — solo
          encuentra algo si la empresa usa uno de esos dos sistemas y el nombre coincide.
        </p>

        <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4">
          <button
            onClick={runHiringScan}
            disabled={scanning}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <Radar size={15} /> {scanning ? "Buscando..." : "Buscar ahora"}
          </button>

          {scanResult && (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-neutral-700">
                Revisadas <strong>{scanResult.companiesChecked}</strong> empresas · encontraron
                vacantes <strong>{scanResult.companiesWithJobs}</strong> · señales nuevas creadas{" "}
                <strong>{scanResult.signalsCreated}</strong>
              </p>
              {scanResult.details.length > 0 && (
                <ul className="space-y-1 text-xs text-neutral-500">
                  {scanResult.details.map((d) => (
                    <li key={d.company}>
                      {d.company}: {d.jobsFound > 0 ? `${d.jobsFound} vacante(s) — ${d.signalsCreated} señal(es) nueva(s)` : "sin resultados"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-900">Secuencias — envío real</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Manda el próximo paso a quien ya le toca en cualquier secuencia activa, vía Resend.
          Sin cron: solo procesa cuando lo apretás. Requiere tener configurado{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">RESEND_API_KEY</code> y{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">SEQUENCES_FROM_EMAIL</code> en
          el servidor.
        </p>

        <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4">
          <button
            onClick={runSequenceDispatch}
            disabled={dispatching}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <Send size={15} /> {dispatching ? "Procesando..." : "Procesar envíos pendientes"}
          </button>

          {dispatchResult && "error" in dispatchResult && (
            <p className="mt-3 text-sm text-red-600">{dispatchResult.error}</p>
          )}

          {dispatchResult && !("error" in dispatchResult) && (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-neutral-700">
                Vencidos hoy <strong>{dispatchResult.dueToday}</strong> (tope diario{" "}
                {dispatchResult.dailyCap}) · enviados <strong>{dispatchResult.sent}</strong> · sin
                email <strong>{dispatchResult.skippedNoEmail}</strong> · con error{" "}
                <strong>{dispatchResult.failed}</strong>
              </p>
              {dispatchResult.details.length > 0 && (
                <ul className="space-y-1 text-xs text-neutral-500">
                  {dispatchResult.details.map((d, i) => (
                    <li key={i}>
                      {d.contact} — paso {d.step + 1}: {d.result}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
