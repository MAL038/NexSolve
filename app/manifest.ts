// app/manifest.ts
// Next.js 14 App Router — genereert automatisch /manifest.webmanifest
// Hierdoor is de app installeerbaar als PWA op iOS en Android.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXSOLVE",
    short_name: "Nexsolve",
    description: "Project management platform by NEXSOLVE",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0A6645",   // NEXSOLVE brand groen (was #2563eb)
    // Geen orientation-lock → werkt zowel portret (iPhone) als landscape (iPad)
    categories: ["business", "productivity"],
    icons: [
      {
        // SVG schaalt naar elke grootte — gebruikt door Android Chrome
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        // PNG voor maskable (adaptieve iconen op Android)
        // /apple-icon.png wordt automatisch gegenereerd door app/apple-icon.tsx
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
