import { NextResponse } from "next/server";
import { isHttpError } from "@/lib/server/http-error";
import { getSessionCookie } from "@/lib/server/session";
import {
  parseAiPreference,
  parseOfferingCourses,
} from "@/modules/schedule-ai/schedule-ai.validator";
import { generateScheduleWithAI } from "@/modules/schedule-ai/schedule-ai.service";
import { flattenOfferingCourses } from "@/modules/schedule-ai/schedule-ai.utils";

const unauthorized = () =>
  NextResponse.json(
    { message: "Unauthorized: Silakan login terlebih dahulu" },
    { status: 401 },
  );

/** POST /api/schedule-ai — generate an optimized schedule from student preferences. */
export async function postGenerateSchedule(req: Request) {
  const startedAt = Date.now();
  try {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) return unauthorized();

    const body = await req.json();
    const preference = parseAiPreference(body);
    const offeringCourses = parseOfferingCourses(body.offeringCourses);
    const availableCourses = flattenOfferingCourses(offeringCourses);

    console.log("[schedule-ai] request received", {
      semesterGroups: offeringCourses.length,
      totalCourses: availableCourses.length,
      preference,
    });

    const { courses } = await generateScheduleWithAI(availableCourses, preference);

    console.log("[schedule-ai] request succeeded", {
      selectedCourses: courses.length,
      totalMs: Date.now() - startedAt,
    });

    return NextResponse.json({ success: true, data: { courses } });
  } catch (error) {
    if (isHttpError(error)) {
      console.error("[schedule-ai] request failed", {
        status: error.status,
        message: error.message,
        payload: error.payload,
        totalMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { message: error.message, ...error.payload },
        { status: error.status },
      );
    }

    const detail = error instanceof Error ? error.message : String(error);
    console.error("[schedule-ai] request crashed", {
      detail,
      totalMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        message: "Gagal menghasilkan jadwal. Silakan coba lagi.",
        detail,
      },
      { status: 500 },
    );
  }
}
