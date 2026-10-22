import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Nome deve avere almeno 2 caratteri").optional(),
  email: z.email("Email non valida").optional(),
  currency: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password deve avere almeno 6 caratteri").optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
