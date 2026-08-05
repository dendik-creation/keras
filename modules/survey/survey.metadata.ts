import type { SurveyMetadata } from "./survey.types";

export function parseBrowserFromUA(ua: string): string {
  if (!ua) return "Lainnya";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("OPR/") || ua.includes("Opera/")) return "Opera";
  return "Lainnya";
}

export function parseOSFromUA(ua: string): string {
  if (!ua) return "Lainnya";
  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod") || ua.includes("like Mac")) return "iOS";
  return "Lainnya";
}

export function parseDeviceFromUA(ua: string): string {
  if (!ua) return "Desktop";
  if (/Mobi|Android|iPhone/i.test(ua)) return "Mobile";
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

export function getClientSurveyMetadata(): SurveyMetadata {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      browser: "Lainnya",
      os: "Lainnya",
      device: "Desktop",
      screenWidth: 0,
      language: "id-ID",
    };
  }

  const ua = navigator.userAgent || "";
  const browser = parseBrowserFromUA(ua);
  const os = parseOSFromUA(ua);
  const device = parseDeviceFromUA(ua);
  const screenWidth = window.innerWidth || 0;
  const language = navigator.language || "id-ID";

  return {
    browser,
    os,
    device,
    screenWidth,
    language,
  };
}

export function getServerSurveyMetadata(userAgent: string, acceptLanguage: string): SurveyMetadata {
  const browser = parseBrowserFromUA(userAgent);
  const os = parseOSFromUA(userAgent);
  const device = parseDeviceFromUA(userAgent);
  const screenWidth = 0;
  const language = acceptLanguage.split(",")[0]?.trim() || "id-ID";

  return {
    browser,
    os,
    device,
    screenWidth,
    language,
  };
}
