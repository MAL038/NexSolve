import { requireSuperuser } from "@/lib/auth";
import AdminDashboardClient from "./AdminDashboardClient";

export const metadata = { title: "Systeemdashboard — Admin" };

export default async function AdminPage() {
  await requireSuperuser();
  return <AdminDashboardClient />;
}
