import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seed-data";

export const maxDuration = 60;

/**
 * One-time seed endpoint for the deployed database.
 * Guard: ?key=<SESSION_SECRET>. Safe to leave in — it only runs with the secret,
 * and it just resets to the demo data.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.SESSION_SECRET || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const { items } = await runSeed(prisma);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("[seed] failed", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
