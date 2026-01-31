import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId: session.user.id }],
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Errore categories GET:", error);
    return NextResponse.json(
      { error: "Errore nel recupero delle categorie" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, icon, color } = validated.data;

    const existing = await prisma.category.findFirst({
      where: {
        name,
        OR: [{ isDefault: true }, { userId: session.user.id }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Categoria già esistente" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        icon,
        color: color || "#6366f1",
        userId: session.user.id,
        isDefault: false,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Errore nella creazione della categoria" },
      { status: 500 }
    );
  }
}
