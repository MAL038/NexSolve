import { requireSuperuser } from "@/lib/auth";
import AdminActivityClient from "./AdminActivityClient";

export const metadata = { title: "Activiteitenlog — Admin" };

export default async function AdminActivityPage() {
  await requireSuperuser();
  return <AdminActivityClient />;
}
