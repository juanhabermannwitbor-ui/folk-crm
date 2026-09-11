// Import/export de contactos vía CSV/XLSX — parseo, detección de columnas,
// y (para export) generación del archivo. Todo corre en el navegador: al
// importar, al servidor solo llega el JSON ya mapeado (ver
// /api/contacts/import); al exportar, el archivo nunca pasa por el servidor.
import type { Contact } from "@/lib/types";

export type ImportField =
  | "fullName"
  | "email"
  | "phone"
  | "company"
  | "title"
  | "location"
  | "linkedinUrl"
  | "notes";

export const IMPORT_FIELDS: { field: ImportField; label: string; required?: boolean }[] = [
  { field: "fullName", label: "Nombre completo", required: true },
  { field: "email", label: "Email" },
  { field: "phone", label: "Teléfono" },
  { field: "company", label: "Empresa" },
  { field: "title", label: "Cargo" },
  { field: "location", label: "Ubicación" },
  { field: "linkedinUrl", label: "LinkedIn" },
  { field: "notes", label: "Notas" },
];

const HEADER_ALIASES: Record<ImportField, string[]> = {
  fullName: ["nombre completo", "nombre", "full name", "name", "fullname", "contacto"],
  email: ["email", "correo", "correo electronico", "e-mail", "mail"],
  phone: ["telefono", "phone", "celular", "whatsapp", "movil", "numero", "numero de telefono"],
  company: ["empresa", "company", "organizacion", "compania", "cuenta"],
  title: ["cargo", "puesto", "title", "position", "job title", "rol"],
  location: ["ubicacion", "location", "ciudad", "city", "pais", "country"],
  linkedinUrl: ["linkedin", "linkedin url", "perfil linkedin", "url linkedin"],
  notes: ["notas", "notes", "comentarios", "observaciones"],
};

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, ""); // saca tildes para poder comparar
}

export function guessColumnMapping(headers: string[]): Partial<Record<ImportField, string>> {
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  const mapping: Partial<Record<ImportField, string>> = {};
  for (const { field } of IMPORT_FIELDS) {
    const match = normalizedHeaders.find((h) => HEADER_ALIASES[field].includes(h.norm));
    if (match) mapping[field] = match.raw;
  }
  return mapping;
}

export type ParsedSpreadsheet = { headers: string[]; rows: Record<string, string>[] };

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    return { headers: result.meta.fields ?? [], rows: result.data };
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { defval: "" });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

function contactExportValue(contact: Contact, field: ImportField): string {
  const value = contact[field as keyof Contact];
  return typeof value === "string" ? value : "";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Genera y descarga un .csv o .xlsx con las mismas columnas que usa la
// plantilla de importación, para que el archivo exportado se pueda volver
// a importar tal cual (round-trip).
export async function exportContactsToFile(
  contacts: Contact[],
  format: "csv" | "xlsx",
  filename: string
) {
  const headerLabels = IMPORT_FIELDS.map((f) => f.label);
  const rows = contacts.map((c) => IMPORT_FIELDS.map((f) => contactExportValue(c, f.field)));

  if (format === "csv") {
    const Papa = (await import("papaparse")).default;
    const csv = Papa.unparse({ fields: headerLabels, data: rows });
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
    return;
  }

  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([headerLabels, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Contactos");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  downloadBlob(new Blob([buffer], { type: "application/octet-stream" }), `${filename}.xlsx`);
}
