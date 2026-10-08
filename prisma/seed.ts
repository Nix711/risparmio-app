import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { sumMoney } from "../lib/money";
import { prisma } from "../lib/prisma";

const defaultCategories = [
  { name: "Alimentari", icon: "🛒", color: "#22c55e" },
  { name: "Trasporti", icon: "🚗", color: "#3b82f6" },
  { name: "Casa", icon: "🏠", color: "#f59e0b" },
  { name: "Salute", icon: "💊", color: "#ef4444" },
  { name: "Svago", icon: "🎬", color: "#8b5cf6" },
  { name: "Shopping", icon: "🛍️", color: "#ec4899" },
  { name: "Bollette", icon: "📄", color: "#6366f1" },
  { name: "Ristoranti", icon: "🍽️", color: "#f97316" },
  { name: "Abbonamenti", icon: "📱", color: "#14b8a6" },
  { name: "Altro", icon: "📦", color: "#71717a" },
];

const DEMO_EMAIL = "demo@balancebook.local";
const DEMO_PASSWORD = "demo1234";

// Movimenti di un mese tipo. Gli array hanno una voce per ciascuno dei sei mesi
// generati, così gli importi variano e i grafici hanno un andamento; null = nessun movimento.
const monthlyMovements: {
  day: number;
  amounts: (string | null)[];
  description: string;
  category: string;
  type: "expense" | "income";
}[] = [
  { day: 27, amounts: ["1850.00", "1850.00", "1850.00", "1850.00", "1850.00", "1850.00"], description: "Stipendio", category: "Altro", type: "income" },
  { day: 1, amounts: ["650.00", "650.00", "650.00", "650.00", "650.00", "650.00"], description: "Affitto", category: "Casa", type: "expense" },
  { day: 12, amounts: ["92.40", "88.15", "74.30", "61.90", "58.75", "66.20"], description: "Luce e gas", category: "Bollette", type: "expense" },
  { day: 3, amounts: ["64.35", "48.90", "71.20", "55.60", "62.10", "58.45"], description: "Spesa settimanale", category: "Alimentari", type: "expense" },
  { day: 10, amounts: ["51.80", "66.25", "47.90", "69.40", "53.15", "60.30"], description: "Spesa settimanale", category: "Alimentari", type: "expense" },
  { day: 17, amounts: ["58.70", "44.35", "63.90", "49.95", "72.60", "55.20"], description: "Spesa settimanale", category: "Alimentari", type: "expense" },
  { day: 24, amounts: ["67.15", "59.80", "52.40", "61.25", "46.90", "64.75"], description: "Spesa settimanale", category: "Alimentari", type: "expense" },
  { day: 5, amounts: ["12.99", "12.99", "12.99", "12.99", "12.99", "12.99"], description: "Streaming", category: "Abbonamenti", type: "expense" },
  { day: 8, amounts: ["55.00", "60.00", "52.50", "58.00", "61.00", "54.00"], description: "Carburante", category: "Trasporti", type: "expense" },
  { day: 15, amounts: [null, "18.50", null, "24.90", null, "12.40"], description: "Farmacia", category: "Salute", type: "expense" },
  { day: 20, amounts: ["42.00", "36.50", "58.00", "27.80", "45.20", "39.90"], description: "Cena fuori", category: "Ristoranti", type: "expense" },
  { day: 22, amounts: ["19.00", null, "24.00", "19.00", null, "21.50"], description: "Cinema", category: "Svago", type: "expense" },
  { day: 18, amounts: [null, "79.99", null, "34.90", null, "120.00"], description: "Abbigliamento", category: "Shopping", type: "expense" },
];

// I dati demo creano un utente con password nota: finiscono solo su un database
// locale, perché in questo progetto è già capitato di scrivere in produzione per errore.
function isLocalDatabase(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  const { hostname } = new URL(url);
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

// "YYYY-MM-DD", il formato che l'app usa per le date degli obiettivi
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function seedCategories() {
  console.log("Seeding default categories...");

  for (const category of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: category.name,
        userId: null,
      },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: category.name,
          icon: category.icon,
          color: category.color,
          isDefault: true,
          userId: null,
        },
      });
      console.log(`Created category: ${category.name}`);
    } else {
      console.log(`Category already exists: ${category.name}`);
    }
  }
}

async function seedDemoData() {
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existingUser) {
    console.log("Demo user already exists, skipping demo data");
    return;
  }

  console.log("Seeding demo data...");

  const user = await prisma.user.create({
    data: {
      name: "Utente Demo",
      email: DEMO_EMAIL,
      password: await hash(DEMO_PASSWORD, 12),
    },
  });

  const categories = await prisma.category.findMany({ where: { isDefault: true } });
  const categoryId = (name: string) => {
    const category = categories.find((c) => c.name === name);
    if (!category) throw new Error(`Default category not found: ${name}`);
    return category.id;
  };

  // Sei mesi fino a quello corrente. Le date sono a mezzanotte UTC come quelle create
  // dall'API (new Date("YYYY-MM-DD")). Un create per riga e non createMany: l'estensione
  // in lib/prisma.ts cifra la descrizione solo in create, update e upsert.
  const now = new Date();
  let created = 0;
  for (let offset = 0; offset < 6; offset++) {
    const monthsAgo = 5 - offset;
    for (const movement of monthlyMovements) {
      const amount = movement.amounts[offset];
      const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - monthsAgo, movement.day));
      if (amount === null || date > now) continue;

      await prisma.expense.create({
        data: {
          amount,
          description: movement.description,
          date,
          type: movement.type,
          userId: user.id,
          categoryId: categoryId(movement.category),
        },
      });
      created++;
    }
  }
  console.log(`Created ${created} movements`);

  const dateInMonth = (monthsAgo: number, day: number) =>
    isoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth() - monthsAgo, day)));

  const goals = [
    {
      name: "Fondo emergenze",
      emoji: "🛟",
      target: "3000.00",
      due: dateInMonth(-12, 1),
      accent: "#A78BFA",
      contributions: [
        { amount: "200.00", date: dateInMonth(3, 28), note: "Primo versamento" },
        { amount: "200.00", date: dateInMonth(2, 28) },
        { amount: "250.00", date: dateInMonth(1, 28) },
      ],
    },
    {
      name: "Vacanza estiva",
      emoji: "✈️",
      target: "1500.00",
      due: dateInMonth(-8, 1),
      accent: "#38BDF8",
      contributions: [{ amount: "150.00", date: dateInMonth(1, 28) }],
    },
  ];

  // `saved` è la somma dei versamenti, come la mantiene l'API a ogni contributo
  for (const { contributions, ...goal } of goals) {
    await prisma.savingGoal.create({
      data: {
        ...goal,
        saved: sumMoney(contributions.map((c) => new Prisma.Decimal(c.amount))),
        userId: user.id,
        contributions: { create: contributions },
      },
    });
  }
  console.log(`Created ${goals.length} saving goals`);
  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

async function main() {
  await seedCategories();

  if (isLocalDatabase()) {
    await seedDemoData();
  } else {
    console.log("Database is not local, skipping demo data");
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
