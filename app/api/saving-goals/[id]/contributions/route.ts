import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { addContributionSchema } from "@/lib/validations/savingGoal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { id } = await params;

    const goal = await prisma.savingGoal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!goal) {
      return NextResponse.json({ error: "Obiettivo non trovato" }, { status: 404 });
    }

    const contributions = await prisma.goalContribution.findMany({
      where: { goalId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(serializeMoney(contributions));
  } catch {
    return NextResponse.json(
      { error: "Errore nel recupero dei contributi" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { id } = await params;

    const goal = await prisma.savingGoal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!goal) {
      return NextResponse.json({ error: "Obiettivo non trovato" }, { status: 404 });
    }

    const body = await request.json();
    const validated = addContributionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { amount, date, note } = validated.data;

    // Atomic: create contribution + increment saved on the goal
    const result = await prisma.$transaction(async (tx) => {
      const contribution = await tx.goalContribution.create({
        data: { goalId: id, amount, date, note },
      });
      const updatedGoal = await tx.savingGoal.update({
        where: { id },
        data: { saved: { increment: amount } },
        include: { contributions: { orderBy: { createdAt: "desc" } } },
      });
      return { contribution, goal: updatedGoal };
    });

    return NextResponse.json(serializeMoney(result), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Errore nell'aggiunta del contributo" },
      { status: 500 }
    );
  }
}
