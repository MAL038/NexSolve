import { requireSuperuser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin – Thema's" };

export default async function LegacyAdminTheemasPage() {
  await requireSuperuser();
  redirect("/admin/themas");
}
