"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  homeFor,
  verifyPassword,
  type Role,
} from "@/lib/auth";

export type AuthState = { error?: string };

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Tell us your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return { error: "Email or password is incorrect" };
  }

  await createSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
  });
  redirect(homeFor(user.role as Role));
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "An account with this email already exists" };

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: await hashPassword(parsed.data.password),
      role: "student",
    },
  });

  await createSession({ userId: user.id, role: "student", name: user.name, email: user.email });
  redirect("/menu");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
