"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import type { Contact, ContactCategory } from "@/lib/types";
import {
  guessColumnMapping,
  IMPORT_FIELDS,
  parseSpreadsheetFile,
  type ImportField,
} from "@/lib/importContacts";

const MAX_ROWS = 500;

type Step = "select" | "map" | "result";

type ImportResult = {
  contacts: Contact[];
  createdCount: number;
  skippedInvalid: number;
  // Modo "categoría" (/api/contacts/import):
  skippedDuplicate?: number;
  // Modo "lista" (/api/lists/[id]/import):
  matchedCount?: number;
  addedToList?: number;
};

export function ImportContactsModal({
  category,
  listId,
  onClose,
  onImported,
}: {
  // Uno de los dos, según desde dónde se abra el modal: category importa a
  // una de las tablas (Clientes/Partners/Contactos); listId importa directo
  // a una Lista, matcheando por email en vez de crear siempre.
  category?: ContactCategory;
  listId?: string;
  onClose: () => void;
  onImported: (contacts: Contact[]) => void;
}) {
  const [step, setStep] = useState<Step>("select");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (parsed.rows.length === 0) {
        setError("El archivo no tiene filas de datos.");
        return;
      }
      if (parsed.rows.length > MAX_ROWS) {
        setError(
          `El archivo tiene ${parsed.rows.length} filas — el máximo por importación es ${MAX_ROWS}. Dividilo en partes más chicas.`
        );
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(guessColumnMapping(parsed.headers));
      setStep("map");
    } catch {
      setError("No se pudo leer el archivo. Verificá que sea un .csv o .xlsx válido.");
    }
  }

  async function handleImport() {
    if (!mapping.fullName) {
      setError('Falta indicar qué columna es "Nombre completo".');
      return;
    }
    setImporting(true);
    setError(null);

    const contacts = rows.map((row) => {
      const get = (field: ImportField) => {
        const col = mapping[field];
        return col ? (row[col] ?? "").toString().trim() : "";
      };
      return {
        fullName: get("fullName"),
        email: get("email") || null,
        phone: get("phone") || null,
        company: get("company") || null,
        title: get("title") || null,
        location: get("location") || null,
        linkedinUrl: get("linkedinUrl") || null,
        notes: get("notes") || null,
      };
    });

    const res = await fetch(listId ? `/api/lists/${listId}/import` : "/api/contacts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listId ? { contacts } : { category, contacts }),
    });
    setImporting(false);
    if (!res.ok) {
      setError("No se pudo importar el archivo.");
      return;
    }
    const data: ImportResult = await res.json();
    setResult(data);
    setStep("result");
    onImported(data.contacts);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Importar contactos</h2>
          <button onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        {step === "select" && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">
              Subí un archivo .csv o .xlsx con tus contactos. En el siguiente paso vas a poder indicar
              qué columna corresponde a cada dato.
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-10 text-sm text-neutral-500 hover:border-neutral-400">
              <Upload size={20} />
              Elegir archivo (.csv, .xlsx)
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === "map" && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">
              Detectamos <strong>{rows.length}</strong> filas. Confirmá qué columna corresponde a cada
              dato — dejá &ldquo;— no importar —&rdquo; si no aplica.
            </p>
            <div className="space-y-2">
              {IMPORT_FIELDS.map((f) => (
                <label key={f.field} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-neutral-600">
                    {f.label}
                    {f.required && " *"}
                  </span>
                  <select
                    value={mapping[f.field] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [f.field]: e.target.value || undefined }))
                    }
                    className="input max-w-[220px]"
                  >
                    <option value="">— no importar —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStep("select")}
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Atrás
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {importing ? "Importando..." : `Importar ${rows.length} contactos`}
              </button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-700">
              Se crearon <strong>{result.createdCount}</strong> contactos
              {result.matchedCount !== undefined && (
                <>
                  {" "}
                  y se reutilizaron <strong>{result.matchedCount}</strong> ya existentes (mismo email)
                </>
              )}
              .
            </p>
            {result.addedToList !== undefined && (
              <p className="text-xs text-neutral-500">
                {result.addedToList} agregados a la lista.
              </p>
            )}
            {!!result.skippedDuplicate && result.skippedDuplicate > 0 && (
              <p className="text-xs text-neutral-500">
                {result.skippedDuplicate} se saltearon por ya existir (mismo email).
              </p>
            )}
            {result.skippedInvalid > 0 && (
              <p className="text-xs text-neutral-500">
                {result.skippedInvalid} se saltearon por no tener nombre.
              </p>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
