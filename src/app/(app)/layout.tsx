import { requireUser } from "@/lib/auth";
import { getCartSummary } from "@/lib/cart";
import { AppShell } from "@/components/app/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const cart = await getCartSummary(session.userId);
  return (
    <AppShell
      name={session.name}
      email={session.email}
      cartCount={cart.count}
      cartSubtotalCents={cart.subtotalCents}
    >
      {children}
    </AppShell>
  );
}
