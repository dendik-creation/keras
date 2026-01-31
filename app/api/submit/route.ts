import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { envVariable } from "@/lib/utils";
import * as cheerio from "cheerio";
import { axiosScrapClient } from "@/helper/axios_client";
import https from "https";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("external_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "Unauthorized: Sesi habis, silakan login kembali." },
        { status: 401 },
      );
    }

    // Payload
    const { schedule_ids } = await req.json();

    if (
      !schedule_ids ||
      !Array.isArray(schedule_ids) ||
      schedule_ids.length === 0
    ) {
      return NextResponse.json(
        { message: "Tidak ada jadwal yang dipilih." },
        { status: 400 },
      );
    }

    const keepAliveAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false,
    });

    const headers = {
      Cookie: sessionCookie.value,
      Referer: envVariable.KRS_SCHEDULES_FORM,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // Payload to URLSearchParams FormData
    const params = new URLSearchParams();

    schedule_ids.forEach((id: string) => {
      params.append("makul[]", id);
    });

    const submitResponse = await axiosScrapClient.post(
      envVariable.KRS_POST_SCHEDULES,
      params,
      {
        headers: headers,
        httpsAgent: keepAliveAgent,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 500,
      },
    );

    let htmlContent = submitResponse.data;
    //  Need redirect from 303 to get alert message
    if (submitResponse.status === 302 || submitResponse.status === 303) {
      const redirectUrl = submitResponse.headers["location"];

      if (redirectUrl) {
        const followResponse = await axiosScrapClient.get(redirectUrl, {
          headers: { Cookie: sessionCookie.value },
          httpsAgent: keepAliveAgent,
        });

        htmlContent = followResponse.data;
      }
    }
    const $ = cheerio.load(htmlContent);
    const messages: string[] = [];

    // Scrap alert messages
    $(".alert[role='alert']").each((_, el) => {
      const divContent = $(el).find("div");

      if (divContent.length > 0) {
        messages.push(divContent.text());
      } else {
        messages.push($(el).text());
      }
    });

    const isSuccess =
      messages.length > 0 ||
      submitResponse.status === 302 ||
      submitResponse.status === 200;

    return NextResponse.json({
      success: isSuccess,
      messages: messages,
      status_code: submitResponse.status,
    });
  } catch (error: any) {
    console.error("SUBMIT ERROR:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server saat submit.",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}
