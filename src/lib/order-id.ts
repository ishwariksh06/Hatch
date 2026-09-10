import { prisma } from "./prisma";

// No ambiguous characters (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(len = 4): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Collision-checked human order id, e.g. "HT-7QK2". */
export async function generatePublicId(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = `HT-${randomCode(4)}`;
    const existing = await prisma.order.findUnique({ where: { publicId: id } });
    if (!existing) return id;
  }
  throw new Error("Could not generate a unique order id");
}

/** Daily token number, resets each calendar day. */
export async function nextTokenNumber(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const count = await prisma.order.count({ where: { placedAt: { gte: start } } });
  return count + 1;
}
