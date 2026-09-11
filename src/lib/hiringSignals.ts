import "server-only";

// Piloto de señal automática de tipo HIRING. Fuente elegida: Greenhouse y
// Lever — los dos Applicant Tracking Systems más comunes que exponen sus
// vacantes en un endpoint JSON público, sin autenticación ni costo
// (pensados por sus propios dueños para embeber el board de empleos en el
// sitio de la empresa). No es scraping: son APIs documentadas y públicas.
//
// La empresa (texto libre en Contact.company) no tiene ningún identificador
// que la vincule a un board de Greenhouse/Lever — el "board token" es un
// slug que cada empresa elige al configurar su ATS. Este módulo lo adivina
// a partir del nombre; cuando la empresa no usa ninguno de los dos ATS, o
// usa un slug distinto al adivinado, el resultado es simplemente "no se
// encontró nada" — un miss silencioso, no un error. Es un piloto de mejor
// esfuerzo, no una integración garantizada.

export type HiringJobPosting = {
  title: string;
  url: string;
  postedAt: Date | null;
};

const COMPANY_SUFFIXES = new Set([
  "inc",
  "incorporated",
  "llc",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "co",
  "company",
  "group",
  "grupo",
  "sa",
  "srl",
  "sac",
  "sl",
]);

function normalizeCompanyName(company: string): string {
  return company
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.,]/g, "");
}

// Devuelve un puñado de slugs candidatos — no una búsqueda exhaustiva, solo
// las formas más comunes en que una empresa suele nombrar su board.
export function guessAtsSlugs(company: string): string[] {
  const normalized = normalizeCompanyName(company);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const withoutSuffix = words.filter((w) => !COMPANY_SUFFIXES.has(w));
  const core = withoutSuffix.length > 0 ? withoutSuffix : words;

  const slugs = new Set<string>();
  slugs.add(core.join(""));
  slugs.add(core.join("-"));
  slugs.add(core[0]);

  return [...slugs].filter((s) => s.length >= 2);
}

async function fetchJson(url: string, timeoutMs = 4000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type GreenhouseJob = { title?: unknown; absolute_url?: unknown; updated_at?: unknown };
type GreenhouseResponse = { jobs?: unknown };

async function fetchGreenhouseJobs(slug: string): Promise<HiringJobPosting[] | null> {
  const body = (await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`
  )) as GreenhouseResponse | null;
  if (!body || !Array.isArray(body.jobs)) return null;

  const jobs = (body.jobs as GreenhouseJob[])
    .map((j) => ({
      title: typeof j.title === "string" ? j.title : "Puesto sin título",
      url: typeof j.absolute_url === "string" ? j.absolute_url : "",
      postedAt: typeof j.updated_at === "string" ? new Date(j.updated_at) : null,
    }))
    .filter((j) => j.url);

  return jobs.length > 0 ? jobs : null;
}

type LeverPosting = { text?: unknown; hostedUrl?: unknown; applyUrl?: unknown; createdAt?: unknown };

async function fetchLeverJobs(slug: string): Promise<HiringJobPosting[] | null> {
  const body = (await fetchJson(
    `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`
  )) as LeverPosting[] | null;
  if (!Array.isArray(body)) return null;

  const jobs = body
    .map((j) => ({
      title: typeof j.text === "string" ? j.text : "Puesto sin título",
      url:
        typeof j.hostedUrl === "string"
          ? j.hostedUrl
          : typeof j.applyUrl === "string"
            ? j.applyUrl
            : "",
      postedAt:
        typeof j.createdAt === "number" || typeof j.createdAt === "string"
          ? new Date(Number(j.createdAt))
          : null,
    }))
    .filter((j) => j.url);

  return jobs.length > 0 ? jobs : null;
}

const MAX_JOBS_PER_COMPANY = 5;

// Prueba los slugs adivinados contra Greenhouse y después Lever, y se
// queda con el primero que devuelva vacantes reales. [] (no null/error)
// cuando no se encontró nada — el caso esperado para la mayoría de las
// empresas, que no usan ninguno de los dos.
export async function findHiringSignalsForCompany(company: string): Promise<HiringJobPosting[]> {
  const slugs = guessAtsSlugs(company);

  for (const slug of slugs) {
    const jobs = await fetchGreenhouseJobs(slug);
    if (jobs) return jobs.slice(0, MAX_JOBS_PER_COMPANY);
  }
  for (const slug of slugs) {
    const jobs = await fetchLeverJobs(slug);
    if (jobs) return jobs.slice(0, MAX_JOBS_PER_COMPANY);
  }
  return [];
}
