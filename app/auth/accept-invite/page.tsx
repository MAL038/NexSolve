import { Suspense } from "react";
import AcceptInviteClient from "./AcceptInviteClient";

export const dynamic = "force-dynamic";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-8">Laden...</div>}>
      <AcceptInviteClient />
    </Suspense>
  );
}