import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSavingGoalSchema } from "@/lib/validations/savingGoal";

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
      include: {
        contributions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Obiettivo non trovato" }, { status: 404 });
    }

    return NextResponse.json(goal);
  } catch {
    return NextResponse.json(
      { error: "Errore nel recupero dell'obiettivo" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.savingGoal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Obiettivo non trovato" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSavingGoalSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const goal = await prisma.savingGoal.update({
      where: { id },
      data: validated.data,
      include: { contributions: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json(goal);
  } catch {
    return NextResponse.json(
      { error: "Errore nell'aggiornamento dell'obiettivo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.savingGoal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Obiettivo non trovato" }, { status: 404 });
    }

    // GoalContributions cascade-deleted via schema onDelete: Cascade
    await prisma.savingGoal.delete({ where: { id } });

    return NextResponse.json({ message: "Obiettivo eliminato" });
  } catch {
    return NextResponse.json(
      { error: "Errore nell'eliminazione dell'obiettivo" },
      { status: 500 }
    );
  }
}
