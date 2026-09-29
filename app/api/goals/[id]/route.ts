import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { updateGoalSchema } from "@/lib/validations/goal";

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

    const existing = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Goal non trovato" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateGoalSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: validated.data,
    });

    return NextResponse.json(serializeMoney(goal));
  } catch {
    return NextResponse.json(
      { error: "Errore nell'aggiornamento del goal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Goal non trovato" }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id } });

    return NextResponse.json({ message: "Goal eliminato" });
  } catch {
    return NextResponse.json(
      { error: "Errore nell'eliminazione del goal" },
      { status: 500 }
    );
  }
}
