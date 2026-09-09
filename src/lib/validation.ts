import { z } from "zod";

export const contactCategorySchema = z.enum([
  "LEAD",
  "CLIENT",
  "PARTNER",
  "INTERESTING",
]);

export const createContactSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(200),
  category: contactCategorySchema.default("LEAD"),
  headline: z.string().trim().max(300).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  title: z.string().trim().max(200).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(50).optional().nullable(),
  linkedinUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  avatarUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  pipelineStageId: z.string().cuid().optional().nullable(),
  dealValue: z.number().int().nonnegative().optional().nullable(),
});

export const updateContactSchema = createContactSchema.partial().extend({
  stageOrder: z.number().int().optional(),
});

export const extensionContactSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  headline: z.string().trim().max(300).optional(),
  company: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  linkedinUrl: z.string().trim().url(),
  avatarUrl: z.string().trim().url().optional(),
  category: contactCategorySchema.optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const createStageSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const reorderStagesSchema = z.object({
  stages: z.array(z.object({ id: z.string().cuid(), order: z.number().int() })),
});

export const enrollmentStatusSchema = z.enum(["ACTIVE", "PAUSED", "STOPPED", "COMPLETED"]);

export const createSequenceSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
});

export const createStepSchema = z.object({
  subject: z.string().trim().min(1, "El asunto es obligatorio").max(200),
  body: z.string().trim().min(1, "El mensaje es obligatorio").max(10000),
  delayDays: z.number().int().min(0).max(365).default(0),
});

export const updateStepSchema = createStepSchema.partial();

export const reorderStepsSchema = z.object({
  steps: z.array(z.object({ id: z.string().cuid(), order: z.number().int() })),
});

export const createEnrollmentSchema = z.object({
  contactId: z.string().cuid(),
});

export const updateEnrollmentSchema = z.object({
  status: enrollmentStatusSchema.optional(),
  currentStep: z.number().int().min(0).optional(),
});

export const composeMessageSchema = z.object({
  channel: z.enum(["EMAIL", "LINKEDIN"]),
  goal: z.string().trim().min(3, "Contá qué querés lograr con el mensaje").max(500),
  tone: z.enum(["profesional", "cercano", "directo"]).default("cercano"),
  contactId: z.string().cuid().optional(),
});
