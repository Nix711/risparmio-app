import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
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
