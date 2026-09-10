import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  return (
    <AuthShell heading="Create account">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
