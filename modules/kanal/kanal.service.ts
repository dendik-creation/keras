import * as cheerio from "cheerio";
import { envVariable } from "@/lib/utils";
import { axiosScrapClient } from "@/helper/axios_client";
import { getCookieMap, mapToHeaderString } from "@/helper/cookie";
import { logger } from "@/lib/logger";
import type { LoginCredentials } from "@/modules/auth/auth.validator";

export async function fetchKanalAvatar({
  username,
  password,
}: LoginCredentials): Promise<string | null> {
  let kanalSession: string | null = null;
  try {
    // logger.log("[kanal-auth] authentication started");
    const getResponse = await axiosScrapClient.get(envVariable.KANAL_SSO_LOGIN_URL, {
      timeout: 10000,
    });
    let cookieMap = getCookieMap(getResponse.headers["set-cookie"]);
    const $ = cheerio.load(getResponse.data);
    const $form = $(`form[action^="https://auth.umk.ac.id/login"]`);
    const actionUrl = $form.attr("action") || envVariable.KANAL_SSO_LOGIN_URL;
    const _token = $form.find('input[name="_token"]').attr("value") || "";

    const params = new URLSearchParams();
    params.append("_token", _token);
    params.append("username", username);
    params.append("password", password);

    const postResponse = await axiosScrapClient.post(actionUrl, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: mapToHeaderString(cookieMap),
        Referer: actionUrl,
        Origin: new URL(actionUrl).origin,
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      timeout: 10000,
    });

    const firstRedirectUrl = postResponse.headers["location"];
    if (!firstRedirectUrl || firstRedirectUrl.includes("login")) {
      // logger.warn("[kanal-auth] authentication failed");
      return null;
    }

    cookieMap = getCookieMap(postResponse.headers["set-cookie"], cookieMap);

    // Follow redirect to Kanal
    const redirectResponse = await axiosScrapClient.get(firstRedirectUrl, {
      headers: {
        Cookie: mapToHeaderString(cookieMap),
        Referer: actionUrl,
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      timeout: 10000,
    });

    cookieMap = getCookieMap(redirectResponse.headers["set-cookie"], cookieMap);
    kanalSession = mapToHeaderString(cookieMap);

    // logger.log("[kanal-auth] authentication succeeded");
    // logger.log("[kanal-profile] profile request started");

    let profileResponse = await axiosScrapClient.get(envVariable.KANAL_DASHBOARD_URL, {
      headers: {
        Cookie: kanalSession,
        Referer: firstRedirectUrl,
      },
      timeout: 10000,
    });

    let $profile = cheerio.load(profileResponse.data);

    // Follow HTML meta refresh if present (e.g., to /sso)
    const refreshMeta = $profile('meta[http-equiv="refresh"]').attr("content");
    if (refreshMeta) {
      const matchUrl = refreshMeta.match(/url=['"]?([^'"]+)['"]?/i);
      if (matchUrl && matchUrl[1]) {
        // logger.log(`[kanal-profile] following meta refresh to ${matchUrl[1]}`);
        
        cookieMap = getCookieMap(profileResponse.headers["set-cookie"], cookieMap);
        kanalSession = mapToHeaderString(cookieMap);

        const ssoResponse = await axiosScrapClient.get(matchUrl[1], {
          headers: {
            Cookie: kanalSession,
            Referer: envVariable.KANAL_DASHBOARD_URL,
          },
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
          timeout: 10000,
        });

        cookieMap = getCookieMap(ssoResponse.headers["set-cookie"], cookieMap);
        
        // Sometimes /sso returns a 302 back to profile, follow it if it's a 302
        if (ssoResponse.status === 302 && ssoResponse.headers["location"]) {
           cookieMap = getCookieMap(ssoResponse.headers["set-cookie"], cookieMap);
        }

        kanalSession = mapToHeaderString(cookieMap);

        // Fetch profile again
        profileResponse = await axiosScrapClient.get(envVariable.KANAL_DASHBOARD_URL, {
          headers: {
            Cookie: kanalSession,
            Referer: matchUrl[1],
          },
          timeout: 10000,
        });

        $profile = cheerio.load(profileResponse.data);
      }
    }

    // Validate if it is actually the profile page (e.g., checking title or not a login form)
    if ($profile("form[action*='login']").length > 0) {
       // logger.warn("[kanal-profile] profile page invalid (login found)");
       return null;
    }

    // logger.log("[kanal-profile] dashboard page detected");

    const $img = $profile("#profile-setting img");
    if ($img.length === 0) {
      // logger.log("[kanal-profile] avatar element not found");
      return null;
    }

    // logger.log("[kanal-profile] avatar element detected");
    const src = $img.attr("src");
    if (!src) return null;

    // e.g. "https://kanal.umk.ac.id/mahasiswa/fotoprofil/<base64>"
    const match = src.match(/\/fotoprofil\/(.+)$/);
    if (!match) return null;

    const base64Part = match[1];
    const decodedUrl = Buffer.from(base64Part, "base64").toString("utf-8");

    try {
      const parsed = new URL(decodedUrl);
      if (parsed.protocol !== "https:") {
        // logger.warn("[kanal-profile] avatar rejected (not https)");
        return null;
      }
      if (parsed.hostname !== "ws.umk.ac.id") {
        // logger.warn(`[kanal-profile] avatar rejected (untrusted host: ${parsed.hostname})`);
        return null;
      }
      // logger.log("[kanal-profile] avatar URL decoded");
      return decodedUrl;
    } catch (e) {
      // logger.warn("[kanal-profile] avatar rejected (invalid URL format)");
      return null;
    }
  } catch (error: any) {
    logger.error("[kanal-profile] error during fetching:", error.message);
    return null;
  } finally {
    if (kanalSession) {
      // Clean up session if possible or just let it be discarded by JS engine
      // Since it's a cookie string stored in memory, we just clear the variable.
      kanalSession = null;
      // logger.log("[kanal-profile] session cleanup completed");
    }
  }
}
