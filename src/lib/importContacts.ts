// Import de contactos desde CSV/XLSX — parseo y detección de columnas.
// El archivo se lee siempre en el navegador; al servidor solo llega el JSON
// ya mapeado (ver /api/contacts/import), nunca el archivo crudo.
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
