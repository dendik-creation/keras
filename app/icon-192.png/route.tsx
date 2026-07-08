import { ImageResponse } from "next/og";

// Swiss-style app icon (192×192), maskable-safe: content centered on full-bleed black.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 30,
            width: 34,
            height: 34,
            background: "#FF3000",
          }}
        />
        <div
          style={{
            fontSize: 116,
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1,
            letterSpacing: -6,
          }}
        >
          K
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
