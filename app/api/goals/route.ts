import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { createGoalSchema } from "@/lib/validations/goal";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: { userId: string; month?: number; year?: number } = {
      userId: session.user.id,
    };

    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const goals = await prisma.goal.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(serializeMoney(goals));
  } catch {
    return NextResponse.json(
      { error: "Errore nel recupero dei goal" },
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
    const validated = createGoalSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, targetAmount, type, month, year } = validated.data;

    const existing = await prisma.goal.findFirst({
      where: {
        userId: session.user.id,
        name,
        month,
        year,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Goal già esistente per questo mese" },
        { status: 400 }
      );
    }

    const goal = await prisma.goal.create({
      data: {
        name,
        targetAmount,
        type,
        month,
        year,
        userId: session.user.id,
      },
    });

    return NextResponse.json(serializeMoney(goal), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Errore nella creazione del goal" },
      { status: 500 }
    );
  }
}
