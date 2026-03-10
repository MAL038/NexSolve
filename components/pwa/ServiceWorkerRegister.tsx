"use client";

// Registreert de service worker zodra de app geladen is.
// Werkt alleen in productie of als de browser service workers ondersteunt.
// Fouten worden stil genegeerd zodat de app altijd werkt, ook zonder SW.

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // SW-registratie is optioneel — app werkt altijd zonder
        });
    });
  }, []);

  return null;
}
