import { requireModuleEnabled } from "@/lib/requireModule";

export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  await requireModuleEnabled("customers");
  return children;
}