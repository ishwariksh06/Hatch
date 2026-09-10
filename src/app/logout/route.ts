import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function GET(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url));
}
