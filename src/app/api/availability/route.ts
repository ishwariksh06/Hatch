import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAvailabilityMap } from "@/lib/menu";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const map = await getAvailabilityMap();
  return NextResponse.json({ availability: map, at: Date.now() });
}
