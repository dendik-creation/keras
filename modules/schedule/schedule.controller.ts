import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/server/session";
import { getOfferingCourses } from "@/modules/schedule/schedule.service";

/** GET /api/schedule */
export async function getSchedule() {
  const start = Date.now();
  console.log("[schedule] GET /api/schedule: request received");
  try {
    const sessionCookie = await getSessionCookie();

    if (!sessionCookie) {
      console.log("[schedule] GET /api/schedule: no session cookie, 401");
      return NextResponse.json(
        { message: "Unauthorized: Silakan login terlebih dahulu" },
        { status: 401 },
      );
    }

    console.log("[schedule] GET /api/schedule: session found, scraping offering courses");
    const data = await getOfferingCourses(sessionCookie.value);
    console.log(
      `[schedule] GET /api/schedule: success, ${data.length} semester groups, ${Date.now() - start}ms`,
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(
      `[schedule] GET /api/schedule: ERROR after ${Date.now() - start}ms —`,
      error.message,
    );
    return NextResponse.json(
      { message: "Server Error", detail: error.message },
      { status: 500 },
    );
  }
}
