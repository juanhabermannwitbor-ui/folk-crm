import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { findHiringSignalsForCompany } from "@/lib/hiringSignals";

// Tope defensivo: cada empresa hace hasta 2 llamadas HTTP externas (~4s de
// timeout cada una) antes de darse por vencida. Para un workspace con pocas
// empresas (como este) es irrelevante; si el workspace creciera mucho,
// habría que mover esto a un job en segundo plano — deliberadamente fuera
// de alcance para este piloto (ver PROJECT_BLUEPRINT.md).
const MAX_COMPANIES_PER_SCAN = 25;

type ScanDetail = { company: string; jobsFound: number; signalsCreated: number };

// Piloto manual de señales HIRING automáticas — se dispara a mano (botón en
// Ajustes), nunca por cron/job en segundo plano. Agrupa los contactos por
// empresa (texto libre), busca vacantes públicas en Greenhouse/Lever una
// vez por empresa, y crea un Signal por cada (contacto, vacante) que todavía
// no exista — deduplicado contra Signal.source (la URL de la vacante), sin
// necesidad de una tabla de tracking aparte.
export async function POST() {
  const ctx = await requireWorkspace();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { workspaceId: ctx.workspace.id, deletedAt: null, company: { not: null } },
    select: { id: true, company: true },
  });

  const contactIdsByCompany = new Map<string, string[]>();
  for (const c of contacts) {
    const company = c.company?.trim();
    if (!company) continue;
    const list = contactIdsByCompany.get(company) ?? [];
    list.push(c.id);
    contactIdsByCompany.set(company, list);
  }

  const companies = [...contactIdsByCompany.keys()].slice(0, MAX_COMPANIES_PER_SCAN);

  let companiesWithJobs = 0;
  let signalsCreated = 0;
  const details: ScanDetail[] = [];

  for (const company of companies) {
    const jobs = await findHiringSignalsForCompany(company);
    if (jobs.length === 0) {
      details.push({ company, jobsFound: 0, signalsCreated: 0 });
      continue;
    }

    companiesWithJobs++;
    const contactIds = contactIdsByCompany.get(company)!;
    let createdForThisCompany = 0;

    for (const contactId of contactIds) {
      for (const job of jobs) {
        const existing = await prisma.signal.findFirst({
          where: { contactId, source: job.url },
        });
        if (existing) continue;

        await prisma.signal.create({
          data: {
            workspaceId: ctx.workspace.id,
            contactId,
            type: "HIRING",
            description: `Nueva posición abierta: "${job.title}"`,
            source: job.url,
            confidence: "MEDIUM",
            detectedAt: job.postedAt ?? new Date(),
          },
        });
        createdForThisCompany++;
        signalsCreated++;
      }
    }

    details.push({ company, jobsFound: jobs.length, signalsCreated: createdForThisCompany });
  }

  return NextResponse.json({
    companiesChecked: companies.length,
    companiesWithJobs,
    signalsCreated,
    details,
  });
}
