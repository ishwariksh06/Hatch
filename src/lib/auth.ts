import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE = "hatch_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "hatch-dev-secret-change-me-0123456789abcdef",
);

export type Role = "student" | "admin" | "runner";
export type Session = {
  userId: string;
  role: Role;
  name: string;
  email: string;
};

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSession(s: Session): Promise<void> {
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: String(payload.userId),
      role: payload.role as Role,
      name: String(payload.name),
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireRole(role: Role): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== role) redirect("/403");
  return s;
}

export function homeFor(role: Role): string {
  if (role === "admin") return "/admin/orders";
  if (role === "runner") return "/runner";
  return "/menu";
}
