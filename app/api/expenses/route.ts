import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema } from "@/lib/validations/expense";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");

    const where: {
      userId: string;
      date?: { gte: Date; lte: Date };
      categoryId?: string;
      type?: string;
    } = {
      userId: session.user.id,
    };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = { gte: startDate, lte: endDate };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (type && (type === "expense" || type === "income")) {
      where.type = type;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(serializeMoney(expenses));
  } catch (error) {
    console.error("Errore expenses GET:", error);
    return NextResponse.json(
      { error: "Errore nel recupero delle transazioni" },
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
    const validated = createExpenseSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { amount, description, categoryId, date, type } = validated.data;

    const expense = await prisma.expense.create({
      data: {
        amount,
        description,
        categoryId,
        date: new Date(date),
        type: type || "expense",
        userId: session.user.id,
      },
      include: { category: true },
    });

    return NextResponse.json(serializeMoney(expense), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Errore nella creazione della transazione" },
      { status: 500 }
    );
  }
}
