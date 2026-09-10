import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  return (
    <AuthShell heading="Sign in">
      <AuthForm mode="login" />
      <p className="mt-8 text-xs text-muted leading-relaxed">
        Demo · student@hatch.dev · admin@hatch.dev · runner@hatch.dev — password{" "}
        <span className="text-ink">hatch1234</span>
      </p>
    </AuthShell>
  );
}
