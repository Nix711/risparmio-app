import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "./encryption";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function decryptDescription<T>(result: T): T {
  if (!result) return result;
  if (Array.isArray(result)) {
    for (const item of result) {
      if (item && typeof item === "object" && "description" in item && typeof item.description === "string") {
        item.description = decrypt(item.description);
      }
    }
    return result;
  }
  if (typeof result === "object" && "description" in result && typeof (result as Record<string, unknown>).description === "string") {
    (result as Record<string, unknown>).description = decrypt((result as Record<string, unknown>).description as string);
  }
  return result;
}

function createPrismaClient() {
  const client = new PrismaClient().$extends({
    query: {
      expense: {
        async create({ args, query }) {
          if (typeof args.data.description === "string") {
            args.data.description = encrypt(args.data.description);
          }
          const result = await query(args);
          return decryptDescription(result);
        },
        async update({ args, query }) {
          if (typeof args.data.description === "string") {
            args.data.description = encrypt(args.data.description);
          }
          const result = await query(args);
          return decryptDescription(result);
        },
        async upsert({ args, query }) {
          if (typeof args.create.description === "string") {
            args.create.description = encrypt(args.create.description);
          }
          if (typeof args.update.description === "string") {
            args.update.description = encrypt(args.update.description);
          }
          const result = await query(args);
          return decryptDescription(result);
        },
        async findMany({ args, query }) {
          const results = await query(args);
          return decryptDescription(results);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptDescription(result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptDescription(result);
        },
      },
    },
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
