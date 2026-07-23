import { NextResponse } from "next/server";
import { isHttpError } from "@/lib/server/http-error";
import { getSessionCookie } from "@/lib/server/session";
import { getOfferingCourses } from "@/modules/schedule/schedule.service";
import { parseAiPreference } from "@/modules/schedule-ai/schedule-ai.validator";
import { generateScheduleWithAI } from "@/modules/schedule-ai/schedule-ai.service";
import { flattenOfferingCourses } from "@/modules/schedule-ai/schedule-ai.utils";

const unauthorized = () =>
  NextResponse.json(
    { message: "Unauthorized: Silakan login terlebih dahulu" },
    { status: 401 },
  );

/** POST /api/schedule-ai — generate an optimized schedule from student preferences. */
export async function postGenerateSchedule(req: Request) {
  try {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) return unauthorized();

    const preference = parseAiPreference(await req.json());

    const offeringCourses = await getOfferingCourses(sessionCookie.value);
    const availableCourses = flattenOfferingCourses(offeringCourses);

    const { courses } = await generateScheduleWithAI(availableCourses, preference);

    return NextResponse.json({ success: true, data: { courses } });
  } catch (error) {
    if (isHttpError(error)) {
      return NextResponse.json(
        { message: error.message, ...error.payload },
        { status: error.status },
      );
    }

    const detail = error instanceof Error ? error.message : String(error);
    console.error("SCHEDULE AI ERROR:", detail);
    return NextResponse.json(
      {
        message: "Gagal menghasilkan jadwal. Silakan coba lagi.",
        detail,
      },
      { status: 500 },
    );
  }
}
