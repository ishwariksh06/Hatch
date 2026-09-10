import { requireRole } from "@/lib/auth";
import { Stub } from "@/components/Stub";

export default async function AdminOrdersPage() {
  const s = await requireRole("admin");
  return <Stub title="Kitchen · Orders" who={s.name} />;
}
