// Single place that builds the derived fullName from firstName/lastName —
// every write path (form, extension, CSV import) goes through this so the
// stored value can never drift out of sync with its two source fields.
export function buildFullName(firstName: string, lastName?: string | null) {
  return [firstName.trim(), lastName?.trim()].filter(Boolean).join(" ");
}
