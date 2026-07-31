export type ActiveUser = {
  name: string;
  nim: string;
  major: string;
  degree: string;
};

export type DeviceContext = {
  browser: string;
  os: string;
  device: string;
  page_version: string;
};

export function detectDeviceContext(): DeviceContext {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      browser: "unknown",
      os: "unknown",
      device: "unknown",
      page_version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    };
  }
  const ua = navigator.userAgent || "";
  let browser = "Other";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";

  let os = "Other";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod"))
    os = "iOS";

  let device = "Desktop";
  if (/Mobi|Android|iPhone/i.test(ua)) device = "Mobile";
  else if (/iPad|Tablet/i.test(ua)) device = "Tablet";

  return {
    browser,
    os,
    device,
    page_version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  };
}

