import { z } from "zod";
import { nonNegativeAmount, positiveAmount } from "./money";

export const createGoalSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  targetAmount: positiveAmount(),
  type: z.enum(["saving", "limit"]),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
});

export const updateGoalSchema = z.object({
  name: z.string().min(1, "Nome richiesto").optional(),
  targetAmount: positiveAmount().optional(),
  currentAmount: nonNegativeAmount().optional(),
  type: z.enum(["saving", "limit"]).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
