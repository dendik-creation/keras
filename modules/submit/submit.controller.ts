import { NextResponse } from "next/server";
import { isHttpError } from "@/lib/server/http-error";
import { getSessionCookie } from "@/lib/server/session";
import {
  parseDeleteCourses,
  parseSyncCourses,
  validateScheduleIds,
} from "@/modules/submit/submit.validator";
import {
  releaseSchedules,
  submitSchedules,
  syncSchedules,
} from "@/modules/submit/submit.service";
import {
  simulateReleaseSchedules,
  simulateSubmitSchedules,
  simulateSyncSchedules,
} from "@/modules/submit/submit.simulator";
import { isWarTestMode } from "@/lib/server/war-test-mode";
import { logger } from "@/lib/logger";

const httpErrorResponse = (error: unknown) => {
  if (isHttpError(error)) {
    return NextResponse.json(
      { message: error.message, ...error.payload },
      { status: error.status },
    );
  }
  return null;
};

const unauthorized = () =>
  NextResponse.json(
    { message: "Unauthorized: Sesi habis, silakan login kembali." },
    { status: 401 },
  );

/** GET /api/submit — sync target courses to their submit-form ids. */
export async function syncSubmit(req: Request) {
  const sessionCookie = await getSessionCookie();
  if (!sessionCookie) return unauthorized();

  const { searchParams } = new URL(req.url);

  let targetCourses;
  try {
    targetCourses = parseSyncCourses(searchParams);
  } catch (error) {
    const mapped = httpErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }

  let result;
  try {
    result = isWarTestMode()
      ? await simulateSyncSchedules(sessionCookie.value, targetCourses)
      : await syncSchedules(sessionCookie.value, targetCourses);
  } catch (error: any) {
    const mapped = httpErrorResponse(error);
    if (mapped) return mapped;
    
    logger.error("SYNC ERROR:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server saat sinkronisasi jadwal.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  if (!result.warStarted) {
    return NextResponse.json(
      {
        success: false,
        message: "Waktu perang KRS belum dimulai",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Sinkronisasi status jadwal berhasil",
      data: result.schedules,
    },
    { status: 200 },
  );
}

/** POST /api/submit — submit selected schedule ids ("perang submit"). */
export async function postSubmit(req: Request) {
  try {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) return unauthorized();

    const scheduleIds = validateScheduleIds(await req.json());

    const result = isWarTestMode()
      ? await simulateSubmitSchedules(sessionCookie.value, scheduleIds)
      : await submitSchedules(sessionCookie.value, scheduleIds);

    return NextResponse.json({
      success: result.isSuccess,
      messages: result.messages,
      status_code: result.statusCode,
    });
  } catch (error: any) {
    const mapped = httpErrorResponse(error);
    if (mapped) return mapped;

    logger.error("SUBMIT ERROR:", error.message);
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

/** DELETE /api/submit — release (drop) saved courses. */
export async function deleteSubmit(req: Request) {
  try {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) return unauthorized();

    const targetCourses = parseDeleteCourses(await req.json());

    const result = isWarTestMode()
      ? await simulateReleaseSchedules(sessionCookie.value, targetCourses)
      : await releaseSchedules(sessionCookie.value, targetCourses);

    if (!result.matched) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ditemukan jadwal yang cocok untuk dihapus.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: result.isSuccess,
      message: result.message,
      deleted_ids: result.deletedIds,
    });
  } catch (error: any) {
    const mapped = httpErrorResponse(error);
    if (mapped) return mapped;

    logger.error("DELETE ERROR:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server saat menghapus jadwal.",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}
