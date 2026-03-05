import { requireModuleEnabled } from "@/lib/requireModule";

export default async function HoursLayout({ children }: { children: React.ReactNode }) {
  await requireModuleEnabled("time"); // let op: module heet "time"
  return children;
}