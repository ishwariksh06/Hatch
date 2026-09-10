import { requireRole } from "@/lib/auth";
import { Stub } from "@/components/Stub";

export default async function RunnerPage() {
  const s = await requireRole("runner");
  return <Stub title="Runner · Deliveries" who={s.name} />;
}
