// src/lib/server/prisma.ts
import { PrismaClient } from "@prisma/client";

type GlobalWithPrisma = typeof globalThis & { __prisma?: PrismaClient };
const g = globalThis as GlobalWithPrisma;

export const prisma: PrismaClient =
    g.__prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });

if (!g.__prisma) {
    g.__prisma = prisma;
}
