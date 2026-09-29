import { z } from "zod";
import { positiveAmount } from "./money";

export const transactionTypeSchema = z.enum(["expense", "income"]);

export const createExpenseSchema = z.object({
  amount: positiveAmount(),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Seleziona una categoria"),
  date: z.string().or(z.date()),
  type: transactionTypeSchema.default("expense"),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
