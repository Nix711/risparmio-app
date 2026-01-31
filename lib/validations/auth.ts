import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve avere almeno 2 caratteri"),
  email: z.email("Email non valida"),
  password: z.string().min(6, "Password deve avere almeno 6 caratteri"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
