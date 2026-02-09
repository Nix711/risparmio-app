import { PrismaClient } from "@prisma/client";
import { encrypt } from "../lib/encryption";

const prisma = new PrismaClient();

async function main() {
  console.log("Encrypting existing expense descriptions...\n");

  const expenses = await prisma.expense.findMany({
    where: {
      description: { not: null },
    },
    select: { id: true, description: true },
  });

  let encrypted = 0;
  let skipped = 0;

  for (const expense of expenses) {
    if (!expense.description) continue;

    // Skip already encrypted values (format: base64:base64:base64)
    const parts = expense.description.split(":");
    if (parts.length === 3) {
      try {
        Buffer.from(parts[0], "base64");
        Buffer.from(parts[1], "base64");
        Buffer.from(parts[2], "base64");
        skipped++;
        continue;
      } catch {
        // Not encrypted, proceed
      }
    }

    await prisma.expense.update({
      where: { id: expense.id },
      data: { description: encrypt(expense.description) },
    });
    encrypted++;
  }

  console.log(`Done! Encrypted: ${encrypted}, Skipped (already encrypted): ${skipped}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
