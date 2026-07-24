import * as cheerio from "cheerio";
import { envVariable } from "@/lib/utils";
import { axiosScrapClient } from "@/helper/axios_client";
import { getCookieMap, mapToHeaderString } from "@/helper/cookie";
import { createKeepAliveAgent } from "@/lib/server/https-agent";
import { HttpError } from "@/lib/server/http-error";
import type { LoginCredentials } from "@/modules/auth/auth.validator";

export type KrsUser = {
  name: string;
  nim: string;
  major: string;
  degree: string;
};

export type LoginResult =
  | { ok: false; reason: "invalid_credentials" }
  | { ok: false; reason: "questionnaire_required"; questionnaireUrl: string }
  | {
      ok: true;
      sessionValue: string;
      redirectTarget: string | undefined;
      user: KrsUser;
    };

/**
 * Kampus intercepts login with this redirect when a student hasn't filled
 * the per-semester satisfaction questionnaire yet, sending them to the
 * survey site instead of the KRS dashboard.
 */
const QUESTIONNAIRE_HOST = "kuesioner.umk.ac.id";

function isQuestionnaireRedirect(url: string | undefined): url is string {
  return !!url && url.includes(QUESTIONNAIRE_HOST);
}

/**
 * Perform the SSO login flow against the KRS site, accumulating the cookie
 * chain across each redirect and scraping the student's profile.
 */
export async function loginToKrs({
  username,
  password,
}: LoginCredentials): Promise<LoginResult> {
  // 0. GET Login Page
  const getResponse = await axiosScrapClient.get(envVariable.KRS_LOGIN_SSO_URL);
  let cookieMap = getCookieMap(getResponse.headers["set-cookie"]);
  const $ = cheerio.load(getResponse.data);
  const $form = $(`form[action="${envVariable.KRS_LOGIN_SSO_URL}"]`);
  const _token = $form.find('input[name="_token"]').attr("value") || "";

  // 1. POST Login
  const params = new URLSearchParams();
  params.append("_token", _token);
  params.append("username", username);
  params.append("password", password);

  const postResponse = await axiosScrapClient.post(
    envVariable.KRS_LOGIN_SSO_URL,
    params,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: mapToHeaderString(cookieMap),
        Referer: envVariable.KRS_LOGIN_SSO_URL,
        Origin: new URL(envVariable.KRS_LOGIN_SSO_URL).origin,
      },
    },
  );

  // Validate credentials
  if (
    !postResponse.headers["location"] ||
    postResponse.headers["location"].includes("login")
  ) {
    return { ok: false, reason: "invalid_credentials" };
  }

  // 2. First redirect
  const firstRedirectUrl = postResponse.headers["location"];
  if (!firstRedirectUrl) {
    throw new HttpError(500, "Gagal mendapatkan URL Redirect 1");
  }
  if (isQuestionnaireRedirect(firstRedirectUrl)) {
    return {
      ok: false,
      reason: "questionnaire_required",
      questionnaireUrl: firstRedirectUrl,
    };
  }

  // Cookie update from POST login result
  cookieMap = getCookieMap(postResponse.headers["set-cookie"], cookieMap);

  // get Redirect 1
  const redirectResponse = await axiosScrapClient.get(firstRedirectUrl, {
    headers: {
      Cookie: mapToHeaderString(cookieMap),
      Referer: envVariable.KRS_LOGIN_SSO_URL,
    },
  });

  // Update cookies again after first redirect
  cookieMap = getCookieMap(redirectResponse.headers["set-cookie"], cookieMap);

  // 3. Handle Second Redirect (to Dashboard)
  const finalLocation = redirectResponse.headers["location"];
  if (isQuestionnaireRedirect(finalLocation)) {
    return {
      ok: false,
      reason: "questionnaire_required",
      questionnaireUrl: finalLocation,
    };
  }
  let finalHtml = redirectResponse.data;
  if (finalLocation == envVariable.KRS_DASHBOARD_URL) {
    const dashboardResponse = await axiosScrapClient.get(
      envVariable.KRS_GET_SCHEDULES,
      {
        headers: {
          Cookie: mapToHeaderString(cookieMap),
          Referer: firstRedirectUrl,
        },
      },
    );
    finalHtml = dashboardResponse.data;
    cookieMap = getCookieMap(dashboardResponse.headers["set-cookie"], cookieMap);
  } else if (!finalLocation && redirectResponse.status !== 200) {
    throw new HttpError(401, "Gagal masuk ke halaman utama");
  }

  const user = scrapeUser(finalHtml, username);

  return {
    ok: true,
    sessionValue: mapToHeaderString(cookieMap),
    redirectTarget: finalLocation,
    user,
  };
}

/** Extract profile (name, nim, major, degree) from the dashboard HTML. */
function scrapeUser(finalHtml: string, username: string): KrsUser {
  let userData: KrsUser = { name: "", nim: username, major: "", degree: "" };
  const $finalHome = cheerio.load(finalHtml);
  const myNIM = $finalHome("a.link-primary").text().trim();
  const myName =
    $finalHome("a.link-primary").siblings("h5").text().trim() ||
    $finalHome("a.link-primary").parent().find("h5").text().trim();
  const majorAndDegree = $finalHome(
    'h2.accordion-header[style*="border-radius: 0"] > button.accordion-button',
  )
    .first()
    .text()
    .trim();
  if (myName) {
    userData = {
      name: myName,
      nim: myNIM || username,
      major: majorAndDegree.split(" - ")[0] || "",
      degree: majorAndDegree.split(" - ")[1] || "",
    };
  }
  return userData;
}

export type SessionCheckResult =
  | { status: "authenticated" }
  | { status: "expired" }
  | { status: "questionnaire_required"; questionnaireUrl: string }
  | { status: "unknown" };

/**
 * Verify the given session cookie is still authenticated by pinging the
 * dashboard. Distinguishes expired (redirect to login), the campus
 * questionnaire gate (redirect to kuesioner.umk.ac.id), and other states.
 */
export async function checkSessionStatus(
  sessionValue: string,
): Promise<SessionCheckResult> {
  const response = await axiosScrapClient.get(envVariable.KRS_DASHBOARD_URL, {
    headers: {
      Cookie: sessionValue,
    },
    httpsAgent: createKeepAliveAgent(),
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 500,
  });

  const location = response.headers["location"];
  if (isQuestionnaireRedirect(location)) {
    return { status: "questionnaire_required", questionnaireUrl: location };
  }
  if (response.status === 302 || location?.includes("login")) {
    return { status: "expired" };
  }
  if (response.status === 200) {
    return { status: "authenticated" };
  }
  return { status: "unknown" };
}
