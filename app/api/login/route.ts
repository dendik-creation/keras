import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { envVariable } from "@/lib/utils";
import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import { getCookieMap, mapToHeaderString } from "@/helper/cookie";

export async function POST(req: Request) {
  const agent = new https.Agent({ rejectUnauthorized: false });
  const client = axios.create({
    httpsAgent: agent,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    validateStatus: (status) => status >= 200 && status < 400,
    maxRedirects: 0, // KITA HANDLE MANUAL
  });

  try {
    const { username, password } = await req.json();

    const getResponse = await client.get(envVariable.KRS_LOGIN_SSO_URL);
    let cookieMap = getCookieMap(getResponse.headers["set-cookie"]);
    const $ = cheerio.load(getResponse.data);
    const $form = $(`form[action="${envVariable.KRS_LOGIN_SSO_URL}"]`);
    const _token = $form.find('input[name="_token"]').attr("value") || "";

    const params = new URLSearchParams();
    params.append("_token", _token);
    params.append("username", username);
    params.append("password", password);

    const postResponse = await client.post(
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

    // Credentials check - if redirect login again
    if (
      !postResponse.headers["location"] ||
      postResponse.headers["location"].includes("login")
    ) {
      return NextResponse.json(
        { message: "Username atau password salah", error: true },
        { status: 200 },
      );
    }

    // First redirect
    const firstRedirectUrl = postResponse.headers["location"];
    if (!firstRedirectUrl) {
      return NextResponse.json(
        { message: "Gagal mendapatkan URL Redirect 1" },
        { status: 500 },
      );
    }
    cookieMap = getCookieMap(postResponse.headers["set-cookie"], cookieMap);

    // Trigger second redirect
    const redirectResponse = await client.get(firstRedirectUrl, {
      headers: {
        Cookie: mapToHeaderString(cookieMap),
        Referer: envVariable.KRS_LOGIN_SSO_URL,
      },
    });

    // Second redirect location
    const finalLocation = redirectResponse.headers["location"];
    if (!finalLocation || !finalLocation.includes("beranda")) {
      if (redirectResponse.status === 200) {
      } else {
        return NextResponse.json(
          { message: "Username atau password salah" },
          { status: 401 },
        );
      }
    }

    // Collect cookies
    cookieMap = getCookieMap(redirectResponse.headers["set-cookie"], cookieMap);
    const finalCookieValue = mapToHeaderString(cookieMap);
    // Save cookie to browser user`s
    const cookieStore = await cookies();
    cookieStore.set("external_session", finalCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return NextResponse.json({ success: true, redirectTarget: finalLocation });
  } catch (error: any) {
    console.error("FLOW ERROR:", error.message);
    return NextResponse.json(
      { message: "Server Error", detail: error.message },
      { status: 500 },
    );
  }
}
