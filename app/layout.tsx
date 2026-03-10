import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";


const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: { default: "NEXSOLVE", template: "%s | NEXSOLVE" },
  description: "Project management platform by NEXSOLVE",
  applicationName: "NEXSOLVE",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    // black-translucent: status bar overlapt de app (voelt meer native aan)
    // — we compenseren dit met env(safe-area-inset-top) op de topbar
    statusBarStyle: "black-translucent",
    title: "NEXSOLVE",
  },
  formatDetection: {
    telephone: false,
  },
};

// Viewport apart exporteren (vereist door Next.js 14+)
export const viewport: Viewport = {
  themeColor: "#0A6645",   // NEXSOLVE brand groen
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,          // voorkomt dat de app per ongeluk ingezoomd achterblijft op iOS PWA
  userScalable: false,      // consistente schaal/zichtbaarheid op mobiel
  viewportFit: "cover",    // env(safe-area-inset-*) voor notch & home indicator
  interactiveWidget: "resizes-content", // voorkomt layout-jumps bij mobiel toetsenbord
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={poppins.variable}>
      <body className="overscroll-x-none">
        {children}
        {/* Registreer service worker voor PWA offline-ondersteuning */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
