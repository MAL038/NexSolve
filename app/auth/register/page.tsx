// app/auth/register/page.tsx
// Registratie is gesloten — nieuwe gebruikers worden uitgenodigd door een org-owner.
import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/auth/login?melding=gesloten");
}
