// app/apple-icon.tsx
// Next.js genereert hieruit automatisch een <link rel="apple-touch-icon"> in de <head>
// én serveert het bestand op /apple-icon.png (stabiele URL, ook bruikbaar in manifest).
// 180×180 is de aanbevolen maat voor iOS home screen iconen.

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A6645",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Geen borderRadius: iOS past zelf ronde hoeken toe op home screen iconen
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "112px",
            fontWeight: 900,
            fontFamily: "Arial, sans-serif",
            letterSpacing: "-6px",
            lineHeight: 1,
          }}
        >
          N
        </span>
      </div>
    ),
    { ...size }
  );
}
