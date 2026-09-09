"use client";

import { useState } from "react";
import { Sparkles, X, Copy, Check } from "lucide-react";

type ComposeResult = { subject?: string; body: string };

export function AiComposeModal({
  contactId,
  defaultChannel = "EMAIL",
  onClose,
  onApply,
}: {
  contactId?: string;
  defaultChannel?: "EMAIL" | "LINKEDIN";
  onClose: () => void;
  onApply?: (result: ComposeResult) => void;
}) {
  const [channel, setChannel] = useState<"EMAIL" | "LINKEDIN">(defaultChannel);
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("cercano");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (goal.trim().length < 3) {
      setError("Contá un poco qué querés lograr con el mensaje.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/ai/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, goal, tone, contactId }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "No se pudo generar el mensaje.");
      return;
    }

    const { message } = await res.json();
    setResult(message);
  }

  async function handleCopy() {
    if (!result) return;
    const text = result.subject ? `${result.subject}\n\n${result.body}` : result.body;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-neutral-900">
            <Sparkles size={16} className="text-neutral-500" /> Redactar con IA
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Canal</span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as "EMAIL" | "LINKEDIN")}
                className="input"
              >
                <option value="EMAIL">Email</option>
                <option value="LINKEDIN">LinkedIn</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Tono</span>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="input">
                <option value="cercano">Cercano</option>
                <option value="profesional">Profesional</option>
                <option value="directo">Directo</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              ¿Qué querés lograr con el mensaje?
            </span>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="Ej: presentarme y ofrecer una demo de nuestro software de RRHH"
              className="input resize-none"
            />
          </label>

          {!contactId && (
            <p className="text-xs text-neutral-400">
              No hay un contacto puntual acá, así que el mensaje sale como plantilla reutilizable
              (con variables tipo {"{{nombre}}"}).
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {loading ? "Generando..." : result ? "Generar otra vez" : "Generar"}
          </button>

          {result && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              {result.subject && (
                <p className="mb-1.5 text-sm font-semibold text-neutral-800">{result.subject}</p>
              )}
              <p className="whitespace-pre-wrap text-sm text-neutral-700">{result.body}</p>

              <div className="mt-3 flex gap-2">
                {onApply && (
                  <button
                    onClick={() => onApply(result)}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                  >
                    Usar este mensaje
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
