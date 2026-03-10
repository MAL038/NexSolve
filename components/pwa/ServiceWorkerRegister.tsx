"use client";

// Registreert de service worker zodra de app geladen is.
// Alleen in productie om extra overhead/noise in development te voorkomen.
// Fouten worden stil genegeerd zodat de app altijd werkt, ook zonder SW.

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // SW-registratie is optioneel — app werkt altijd zonder
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
