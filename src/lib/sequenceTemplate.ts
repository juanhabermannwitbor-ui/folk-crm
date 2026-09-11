// Shared between the sequence builder's live preview (client, dates as
// strings — see @/lib/types.Contact) and the real dispatch route (server,
// raw Prisma Contact with Date fields) — both need to render the exact same
// {{token}} substitution. Narrowed to just the fields it reads so it works
// with either representation without a type-shape mismatch.
type MergeableContact = {
  fullName: string;
  company: string | null;
  title: string | null;
  location: string | null;
};

export const SEQUENCE_MERGE_TOKENS: {
  token: string;
  label: string;
  get: (c: MergeableContact) => string;
}[] = [
  { token: "{{nombre}}", label: "Nombre", get: (c) => c.fullName.split(" ")[0] || c.fullName },
  { token: "{{nombre_completo}}", label: "Nombre completo", get: (c) => c.fullName },
  { token: "{{empresa}}", label: "Empresa", get: (c) => c.company || "" },
  { token: "{{cargo}}", label: "Cargo", get: (c) => c.title || "" },
  { token: "{{ubicacion}}", label: "Ubicación", get: (c) => c.location || "" },
];

export function renderSequenceTemplate(template: string, contact: MergeableContact | null) {
  if (!contact) return template;
  let result = template;
  for (const { token, get } of SEQUENCE_MERGE_TOKENS) {
    result = result.split(token).join(get(contact) || `(${token} sin dato)`);
  }
  return result;
}
