// lib/cursor.ts
import { prisma } from "./prisma";

export async function getCursor(id: string) {
  const row = await prisma.jobCursor.findUnique({ where: { id } });
  return row?.value ?? null;
}

export async function setCursor(id: string, value: string) {
  await prisma.jobCursor.upsert({
    where: { id },
    update: { value },
    create: { id, value },
  });
}
