import { requireSuperuser } from "@/lib/auth";
import ThemasClient from "./ThemasClient";

export const metadata = { title: "Admin – Thema's" };

export default async function AdminThemasPage() {
  await requireSuperuser();
  return <ThemasClient />;
}
