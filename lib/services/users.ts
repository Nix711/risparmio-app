import type { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { RegisterInput } from "@/lib/validations/auth";
import type { UpdateProfileInput } from "@/lib/validations/profile";
import { InvalidRequestError, NotFoundError } from "./errors";

/** Costo di bcrypt per le password degli utenti: ogni punto in più raddoppia il tempo di calcolo. */
const PASSWORD_HASH_COST = 12;

/** I campi del profilo che escono dalle API: mai l'hash della password. */
const profileFields = { id: true, name: true, email: true, currency: true } satisfies Prisma.UserSelect;

export async function registerUser({ name, email, password }: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new InvalidRequestError("Email già registrata");
  }

  return prisma.user.create({
    data: { name, email, password: await hash(password, PASSWORD_HASH_COST) },
    select: { id: true },
  });
}

export function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { ...profileFields, createdAt: true },
  });
}

/** Aggiorna solo i campi presenti. Per cambiare password serve quella attuale. */
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const { name, email, currency, currentPassword, newPassword } = input;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("Utente non trovato");
  }

  if (newPassword) {
    if (!currentPassword) {
      throw new InvalidRequestError("Password attuale richiesta");
    }
    if (!(await compare(currentPassword, user.password))) {
      throw new InvalidRequestError("Password attuale non corretta");
    }
  }

  if (email && email !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) {
      throw new InvalidRequestError("Email già in uso");
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      currency,
      password: newPassword ? await hash(newPassword, PASSWORD_HASH_COST) : undefined,
    },
    select: profileFields,
  });
}
