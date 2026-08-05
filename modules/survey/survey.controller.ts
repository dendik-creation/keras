import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/server/session";
import { checkSessionStatus } from "@/modules/auth/auth.service";
import { isHttpError } from "@/lib/server/http-error";
import { logger } from "@/lib/logger";
import { surveyService } from "./survey.service";
import * as z from "zod";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    logger.error("[SurveyController] Validation error:", error.errors);
    return NextResponse.json(
      { message: "Kesalahan validasi data survei", errors: error.errors },
      { status: 400 }
    );
  }

  if (isHttpError(error)) {
    return NextResponse.json(
      { message: error.message, ...error.payload },
      { status: error.status }
    );
  }

  logger.error("[SurveyController] Internal error:", error);
  return NextResponse.json(
    { message: "Terjadi kesalahan pada server" },
    { status: 500 }
  );
}

export class SurveyController {
  async handlePost(req: Request): Promise<NextResponse> {
    try {
      const sessionCookie = await getSessionCookie();
      if (!sessionCookie) {
        return NextResponse.json(
          { message: "Silakan login terlebih dahulu" },
          { status: 401 }
        );
      }

      const authCheck = await checkSessionStatus(sessionCookie.value);
      if (authCheck.status !== "authenticated") {
        return NextResponse.json(
          { message: "Silakan login terlebih dahulu" },
          { status: 401 }
        );
      }

      const body = await req.json().catch(() => ({}));
      const userAgent = req.headers.get("user-agent") || "";
      const acceptLanguage = req.headers.get("accept-language") || "";

      const result = await surveyService.handleSubmission(body, {
        userAgent,
        acceptLanguage,
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      return errorResponse(error);
    }
  }
}

export const surveyController = new SurveyController();
