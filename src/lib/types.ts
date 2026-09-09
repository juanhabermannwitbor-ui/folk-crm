export type ContactCategory = "LEAD" | "CLIENT" | "PARTNER" | "INTERESTING";
export type ContactSource = "MANUAL" | "LINKEDIN_EXTENSION" | "IMPORT";

export type PipelineStage = {
  id: string;
  name: string;
  color: string;
  order: number;
};

export type Contact = {
  id: string;
  category: ContactCategory;
  source: ContactSource;
  fullName: string;
  headline: string | null;
  company: string | null;
  title: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  avatarUrl: string | null;
  notes: string | null;
  tags: string[];
  pipelineStageId: string | null;
  pipelineStage?: PipelineStage | null;
  stageOrder: number;
  dealValue: number | null;
  createdAt: string;
  updatedAt: string;
};

export const CATEGORY_LABELS: Record<ContactCategory, string> = {
  LEAD: "Lead",
  CLIENT: "Cliente",
  PARTNER: "Partner",
  INTERESTING: "Contacto",
};

export type EnrollmentStatus = "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";

export type SequenceStep = {
  id: string;
  sequenceId: string;
  order: number;
  delayDays: number;
  subject: string;
  body: string;
};

export type SequenceEnrollment = {
  id: string;
  sequenceId: string;
  contactId: string;
  contact: Contact;
  status: EnrollmentStatus;
  currentStep: number;
  enrolledAt: string;
};

export type Sequence = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  steps: SequenceStep[];
  enrollments: SequenceEnrollment[];
};

export type SequenceSummary = {
  id: string;
  name: string;
  createdAt: string;
  _count: { steps: number; enrollments: number };
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  STOPPED: "Detenido",
  COMPLETED: "Completado",
};
