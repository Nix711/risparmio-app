import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Verifica email e password del form di login. Restituisce l'utente da mettere nella
 * sessione oppure null, che NextAuth traduce in CredentialsSignin senza dire quale
 * dei due campi era sbagliato.
 *
 * Sta fuori da lib/auth.ts per poterla testare: i test d'integrazione simulano quel modulo.
 */
export async function authorizeCredentials(credentials: unknown) {
  const validated = loginSchema.safeParse(credentials);

  if (!validated.success) {
    return null;
  }

  const { email, password } = validated.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  const passwordMatch = await compare(password, user.password);

  if (!passwordMatch) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
