export type ContactCategory = "LEAD" | "CLIENT" | "PARTNER" | "INTERESTING";
export type ContactSource = "MANUAL" | "LINKEDIN_EXTENSION" | "IMPORT";
export type FollowUpAction = "CALL" | "EMAIL" | "LINKEDIN" | "WHATSAPP" | "MEETING";

export const FOLLOW_UP_ACTION_LABELS: Record<FollowUpAction, string> = {
  CALL: "Llamada",
  EMAIL: "Email",
  LINKEDIN: "Mensaje LinkedIn",
  WHATSAPP: "WhatsApp",
  MEETING: "Reunión",
};

export type SignalType =
  | "COMPANY"
  | "CONTACT"
  | "HIRING"
  | "TECHNOLOGY"
  | "GROWTH"
  | "FUNDING"
  | "EXPANSION"
  | "LEADERSHIP"
  | "NEWS"
  | "OTHER";

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  COMPANY: "Empresa",
  CONTACT: "Contacto",
  HIRING: "Contratación",
  TECHNOLOGY: "Tecnología",
  GROWTH: "Crecimiento",
  FUNDING: "Funding",
  EXPANSION: "Expansión",
  LEADERSHIP: "Cambio de liderazgo",
  NEWS: "Noticia",
  OTHER: "Otra",
};

export type SignalConfidence = "LOW" | "MEDIUM" | "HIGH";

export const SIGNAL_CONFIDENCE_LABELS: Record<SignalConfidence, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

export type Signal = {
  id: string;
  contactId: string;
  type: SignalType;
  description: string;
  source: string | null;
  confidence: SignalConfidence;
  detectedAt: string;
  createdAt: string;
};

export type NextBestAction =
  | "CONTACT"
  | "INVESTIGATE"
  | "CONNECT_LINKEDIN"
  | "SEND_MESSAGE"
  | "SCHEDULE_FOLLOWUP"
  | "WAIT"
  | "DO_NOT_CONTACT";

export const NEXT_BEST_ACTION_LABELS: Record<NextBestAction, string> = {
  CONTACT: "Contactar",
  INVESTIGATE: "Investigar",
  CONNECT_LINKEDIN: "Conectar en LinkedIn",
  SEND_MESSAGE: "Enviar mensaje",
  SCHEDULE_FOLLOWUP: "Agendar follow-up",
  WAIT: "Esperar",
  DO_NOT_CONTACT: "No contactar todavía",
};

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
  nextFollowUpAt: string | null;
  nextFollowUpAction: FollowUpAction | null;
  fitScore: number;
  companySignalScore: number;
  contactSignalScore: number;
  timingScore: number;
  whyNow: string | null;
  nextBestAction: NextBestAction | null;
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

export type Task = {
  id: string;
  title: string;
  actionType: FollowUpAction | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  contactId: string | null;
  contact: Pick<Contact, "id" | "fullName" | "category"> | null;
  createdAt: string;
};
