import { requireUser } from "@/lib/auth";
import { Stub } from "@/components/Stub";

export default async function MenuPage() {
  const s = await requireUser();
  return <Stub title="Menu" who={s.name} />;
}
