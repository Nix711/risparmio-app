import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { updateExpenseSchema } from "@/lib/validations/expense";

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

    const existing = await prisma.expense.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateExpenseSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { amount, description, categoryId, date, type } = validated.data;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(description !== undefined && { description }),
        ...(categoryId !== undefined && { categoryId }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(type !== undefined && { type }),
      },
      include: { category: true },
    });

    return NextResponse.json(serializeMoney(expense));
  } catch {
    return NextResponse.json(
      { error: "Errore nell'aggiornamento della spesa" },
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

    const existing = await prisma.expense.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ message: "Spesa eliminata" });
  } catch {
    return NextResponse.json(
      { error: "Errore nell'eliminazione della spesa" },
      { status: 500 }
    );
  }
}
