import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const category = await prisma.category.findFirst({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria non trovata" },
        { status: 404 }
      );
    }

    if (category.isDefault) {
      return NextResponse.json(
        { error: "Non puoi eliminare una categoria predefinita" },
        { status: 400 }
      );
    }

    if (category.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    // Controlla se ci sono spese associate
    const expensesCount = await prisma.expense.count({
      where: { categoryId: id },
    });

    if (expensesCount > 0) {
      return NextResponse.json(
        {
          error: `Questa categoria ha ${expensesCount} spese associate. Elimina prima le spese.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ message: "Categoria eliminata" });
  } catch {
    return NextResponse.json(
      { error: "Errore nell'eliminazione della categoria" },
      { status: 500 }
    );
  }
}
