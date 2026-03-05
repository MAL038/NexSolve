import { requireModuleEnabled } from "@/lib/requireModule";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  await requireModuleEnabled("team");
  return children;
}