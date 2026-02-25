import { requireAuth } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <AppShell>{children}</AppShell>;
}
