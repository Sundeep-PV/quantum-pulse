import { PrismaClient } from "@prisma/client";

// Standard singleton pattern so `tsx watch` / hot-reload in dev doesn't open
// a new connection pool on every reload -- same pattern Quantinnel's other
// Fastify services use.
declare global {
  // eslint-disable-next-line no-var
  var __pulsePrisma: PrismaClient | undefined;
}

export const prisma = global.__pulsePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__pulsePrisma = prisma;
}
