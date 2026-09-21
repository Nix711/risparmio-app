import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSavingGoalSchema } from "@/lib/validations/savingGoal";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const goals = await prisma.savingGoal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        contributions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(goals);
  } catch {
    return NextResponse.json(
      { error: "Errore nel recupero degli obiettivi" },
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
    const validated = createSavingGoalSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, emoji, target, due, accent } = validated.data;

    const goal = await prisma.savingGoal.create({
      data: {
        name,
        emoji,
        target,
        due,
        accent,
        saved: 0,
        userId: session.user.id,
      },
      include: { contributions: true },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Errore nella creazione dell'obiettivo" },
      { status: 500 }
    );
  }
}
