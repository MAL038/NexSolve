// app/icon.tsx
// Next.js genereert hieruit automatisch een <link rel="icon"> in de <head>.
// Gebruikt next/og's ImageResponse voor dynamische PNG-generatie.

import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "7px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "20px",
            fontWeight: 900,
            fontFamily: "Arial, sans-serif",
            letterSpacing: "-1px",
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
