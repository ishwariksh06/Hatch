"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/primitives";
import { loginAction, registerAction, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "register" && (
        <Field label="Name">
          <input name="name" autoComplete="name" className={inputClass} placeholder="Aditya Sharma" />
        </Field>
      )}
      <Field label="Email">
        <input
          name="email"
          type="email"
          autoComplete="email"
          className={inputClass}
          placeholder="you@campus.edu"
        />
      </Field>
      <Field label="Password" hint={mode === "register" ? "At least 8 characters" : undefined}>
        <input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={inputClass}
          placeholder="••••••••"
        />
      </Field>

      {state.error && (
        <p className="text-sm text-[color:var(--color-danger)] bg-danger-soft border border-[color:var(--color-danger)] rounded-[var(--radius-input)] px-3 py-2">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
      </Button>

      <p className="text-sm text-muted text-center">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/register" className="text-ink underline underline-offset-2">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-ink underline underline-offset-2">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
