import { ImageResponse } from "next/og";

// Swiss-style app icon (512×512), maskable-safe: content centered on full-bleed black.
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
            top: 80,
            left: 80,
            width: 90,
            height: 90,
            background: "#FF3000",
          }}
        />
        <div
          style={{
            fontSize: 310,
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1,
            letterSpacing: -16,
          }}
        >
          K
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
