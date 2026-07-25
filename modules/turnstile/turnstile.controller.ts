import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/modules/turnstile/turnstile.service";
import { logger } from "@/lib/logger";

/** POST /api/turnstile-verify  body: { token: string } */
export async function turnstileVerify(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body?.token;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 400 },
      );
    }

    const remoteip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      undefined;

    const result = await verifyTurnstileToken(token, remoteip);

    return NextResponse.json(
      { success: result.success },
      { status: result.success ? 200 : 403 },
    );
  } catch (err) {
    logger.error("Error verifying turnstile:", err);
    return NextResponse.json(
      { success: false, message: "Gagal verifikasi Turnstile" },
      { status: 500 },
    );
  }
}
