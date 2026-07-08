import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon (no transparency; iOS masks corners itself).
export default function AppleIcon() {
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
            top: 28,
            left: 28,
            width: 32,
            height: 32,
            background: "#FF3000",
          }}
        />
        <div
          style={{
            fontSize: 108,
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
    { ...size },
  );
}
