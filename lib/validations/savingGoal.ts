import { z } from "zod";

export const createSavingGoalSchema = z.object({
  name: z.string().min(1, "Nome richiesto").max(50, "Nome troppo lungo"),
  emoji: z.string().min(1).max(8).default("🎯"),
  target: z.number().positive("L'obiettivo deve essere maggiore di 0"),
  due: z.string().min(1, "Scadenza richiesta"),
  accent: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Colore non valido")
    .default("#A78BFA"),
});

export const updateSavingGoalSchema = z.object({
  name: z.string().min(1, "Nome richiesto").max(50, "Nome troppo lungo").optional(),
  emoji: z.string().min(1).max(8).optional(),
  target: z.number().positive("L'obiettivo deve essere maggiore di 0").optional(),
  due: z.string().min(1, "Scadenza richiesta").optional(),
  accent: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Colore non valido")
    .optional(),
});

export const addContributionSchema = z.object({
  amount: z.number().positive("L'importo deve essere maggiore di 0"),
  date: z.string().min(1, "Data richiesta"),
  note: z.string().optional(),
});

export type CreateSavingGoalInput = z.infer<typeof createSavingGoalSchema>;
export type UpdateSavingGoalInput = z.infer<typeof updateSavingGoalSchema>;
export type AddContributionInput = z.infer<typeof addContributionSchema>;
