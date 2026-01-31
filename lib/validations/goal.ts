import { z } from "zod";

export const createGoalSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  targetAmount: z.number().positive("L'importo deve essere positivo"),
  type: z.enum(["saving", "limit"]),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
});

export const updateGoalSchema = z.object({
  name: z.string().min(1, "Nome richiesto").optional(),
  targetAmount: z.number().positive("L'importo deve essere positivo").optional(),
  currentAmount: z.number().min(0).optional(),
  type: z.enum(["saving", "limit"]).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
