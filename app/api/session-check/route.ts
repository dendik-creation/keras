import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { envVariable } from "@/lib/utils";
import { axiosScrapClient } from "@/helper/axios_client";
import https from "https";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("external_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "No session found" },
        { status: 401 },
      );
    }

    const agent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
    });
    const response = await axiosScrapClient.get(envVariable.KRS_DASHBOARD_URL, {
      headers: {
        Cookie: sessionCookie.value,
      },
      httpsAgent: agent,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (
      response.status === 302 ||
      response.headers["location"]?.includes("login")
    ) {
      return NextResponse.json(
        { message: "Session expired at server" },
        { status: 401 },
      );
    }
    if (response.status === 200) {
      return NextResponse.json({ authenticated: true }, { status: 200 });
    }
    return NextResponse.json({ message: "Unknown status" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ message: "Auth check failed" }, { status: 401 });
  }
}
