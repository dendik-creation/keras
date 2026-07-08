import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/server/session";
import { getOfferingCourses } from "@/modules/schedule/schedule.service";

/** GET /api/schedule */
export async function getSchedule() {
  try {
    const sessionCookie = await getSessionCookie();

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "Unauthorized: Silakan login terlebih dahulu" },
        { status: 401 },
      );
    }

    const data = await getOfferingCourses(sessionCookie.value);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("ERROR:", error.message);
    return NextResponse.json(
      { message: "Server Error", detail: error.message },
      { status: 500 },
    );
  }
}
