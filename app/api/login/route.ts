import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { envVariable } from "@/lib/utils";
import * as cheerio from "cheerio";
import { getCookieMap, mapToHeaderString } from "@/helper/cookie";
import { axiosScrapClient } from "@/helper/axios_client";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // 0. GET Login Page
    const getResponse = await axiosScrapClient.get(
      envVariable.KRS_LOGIN_SSO_URL,
    );
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
      return NextResponse.json(
        { message: "Username atau password salah", error: true },
        { status: 200 },
      );
    }

    // 2. First reidrect
    const firstRedirectUrl = postResponse.headers["location"];
    if (!firstRedirectUrl) {
      return NextResponse.json(
        { message: "Gagal mendapatkan URL Redirect 1" },
        { status: 500 },
      );
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
      cookieMap = getCookieMap(
        dashboardResponse.headers["set-cookie"],
        cookieMap,
      );
    } else if (!finalLocation && redirectResponse.status !== 200) {
      return NextResponse.json(
        { message: "Gagal masuk ke halaman utama" },
        { status: 401 },
      );
    }

    let userData = { name: "", nim: username, major: "", degree: "" };
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

    // 5. Set final cookies and return response
    const finalCookieValue = mapToHeaderString(cookieMap);
    const cookieStore = await cookies();
    cookieStore.set("external_session", finalCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json(
      { success: true, redirectTarget: finalLocation, user: userData },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("FLOW ERROR:", error.message);
    return NextResponse.json(
      { message: "Server Error", detail: error.message },
      { status: 500 },
    );
  }
}
