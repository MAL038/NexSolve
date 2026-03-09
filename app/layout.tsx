import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NEXSOLVE", template: "%s | NEXSOLVE" },
  description: "Project management platform by NEXSOLVE",
  applicationName: "NEXSOLVE",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NEXSOLVE",
  },
  formatDetection: {
    telephone: false,
  },
};

// Viewport apart exporteren (vereist door Next.js 14+)
export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
