export const getCookieMap = (
  setCookieHeader: string[] | string | undefined,
  existingMap?: Map<string, string>,
) => {
  const cookieMap = existingMap || new Map<string, string>();

  if (!setCookieHeader) return cookieMap;

  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];

  headers.forEach((cookieStr) => {
    const mainPart = cookieStr.split(";")[0];
    const separatorIndex = mainPart.indexOf("=");

    if (separatorIndex !== -1) {
      const key = mainPart.substring(0, separatorIndex).trim();
      const value = mainPart.substring(separatorIndex + 1).trim();
      cookieMap.set(key, value);
    }
  });

  return cookieMap;
};

export const mapToHeaderString = (cookieMap: Map<string, string>) => {
  return Array.from(cookieMap.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
};
