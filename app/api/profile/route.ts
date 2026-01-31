import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nome deve avere almeno 2 caratteri").optional(),
  email: z.email("Email non valida").optional(),
  currency: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password deve avere almeno 6 caratteri").optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "Errore nel recupero del profilo" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateProfileSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, currency, currentPassword, newPassword } = validated.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    // Se si vuole cambiare password, verifica quella attuale
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Password attuale richiesta" },
          { status: 400 }
        );
      }

      const passwordMatch = await compare(currentPassword, user.password);
      if (!passwordMatch) {
        return NextResponse.json(
          { error: "Password attuale non corretta" },
          { status: 400 }
        );
      }
    }

    // Se si cambia email, verifica che non sia già in uso
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Email già in uso" },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(currency !== undefined && { currency }),
        ...(newPassword && { password: await hash(newPassword, 12) }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch {
    return NextResponse.json(
      { error: "Errore nell'aggiornamento del profilo" },
      { status: 500 }
    );
  }
}
