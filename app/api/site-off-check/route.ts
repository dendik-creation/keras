import { axiosScrapClient } from "@/helper/axios_client";
import { envVariable } from "@/lib/utils";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET() {
  try {
    const response = await axiosScrapClient.get(envVariable.KRS_DASHBOARD_URL, {
      headers: {
        Referer: envVariable.KRS_LOGIN_SSO_URL,
        Origin: new URL(envVariable.KRS_LOGIN_SSO_URL).origin,
      },
    });
    const htmlContent = cheerio.load(response.data);
    const title = htmlContent("title").text();
    const deadlineValue = htmlContent("#deadline").attr("value")?.trim() ?? "";

    // is Site Off
    if (title.includes("Site Off") || deadlineValue != "") {
      return NextResponse.json(
        {
          isSiteOff: true,
          deadline: deadlineValue,
        },
        { status: 200 },
      );
    } else {
      // is Site On
      return NextResponse.json(
        {
          isSiteOff: false,
          deadline: deadlineValue,
        },
        { status: 200 },
      );
    }
  } catch (err) {
    console.error("Error check site off:", err);
    return NextResponse.json(
      { message: "Gagal pengecekan site off" },
      { status: 500 },
    );
  }
}
