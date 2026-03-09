// app/manifest.ts
// Next.js 14 App Router — genereert automatisch /manifest.webmanifest
// Hierdoor is de app installeerbaar als PWA op iOS en Android.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXSOLVE",
    short_name: "Nexsolve",
    description: "Project management platform by NEXSOLVE",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [],
  };
}
