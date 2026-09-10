import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireRole("admin");
  return <AdminShell name={s.name}>{children}</AdminShell>;
}
