import { z } from "zod";

export const createExpenseSchema = z.object({
  amount: z.number().positive("L'importo deve essere positivo"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Seleziona una categoria"),
  date: z.string().or(z.date()),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
