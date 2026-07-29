import { NextResponse } from "next/server";
import { isHttpError } from "@/lib/server/http-error";
import { logger } from "@/lib/logger";
import {
  clearSessionCookie,
  getSessionCookie,
  setSessionCookie,
} from "@/lib/server/session";
import { parseLoginBody } from "@/modules/auth/auth.validator";
import {
  checkSessionStatus,
  loginToKrs,
} from "@/modules/auth/auth.service";
import { fetchKanalAvatar } from "@/modules/kanal/kanal.service";

/** POST /api/login */
export async function login(req: Request) {
  try {
    const credentials = parseLoginBody(await req.json());
    const result = await loginToKrs(credentials);

    if (!result.ok) {
      if (result.reason === "questionnaire_required") {
        return NextResponse.json(
          {
            message: "Isi kuesioner kepuasan mahasiswa dulu sebelum akses KRS",
            error: true,
            reason: result.reason,
            questionnaireUrl: result.questionnaireUrl,
          },
          { status: 200 },
        );
      }
      return NextResponse.json(
        { message: "Username atau password salah", error: true },
        { status: 200 },
      );
    }

    await setSessionCookie(result.sessionValue);

    let user = result.user;
    
    if (credentials.avatarFetched) {
      user.avatarFetched = credentials.avatarFetched;
      user.avatarUrl = credentials.avatarUrl;
    } else {
      const avatarUrl = await fetchKanalAvatar(credentials);
      user.avatarFetched = true;
      user.avatarUrl = avatarUrl;
    }

    return NextResponse.json(
      {
        success: true,
        redirectTarget: result.redirectTarget,
        user,
      },
      { status: 200 },
    );
  } catch (error: any) {
    if (isHttpError(error)) {
      return NextResponse.json(
        { message: error.message, ...error.payload },
        { status: error.status },
      );
    }
    logger.error("FLOW ERROR:", error.message);
    return NextResponse.json(
      { message: "Server Error", detail: error.message },
      { status: 500 },
    );
  }
}

/** POST /api/logout */
export async function logout() {
  try {
    await clearSessionCookie();
    return NextResponse.json({
      success: true,
      message: "Logout sukses",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal melakukan logout" },
      { status: 500 },
    );
  }
}

/** GET /api/session-check */
export async function sessionCheck() {
  try {
    const sessionCookie = await getSessionCookie();

    if (!sessionCookie) {
      return NextResponse.json({ message: "No session found" }, { status: 401 });
    }

    const result = await checkSessionStatus(sessionCookie.value);

    if (result.status === "questionnaire_required") {
      return NextResponse.json(
        {
          message: "Isi kuesioner kepuasan mahasiswa dulu sebelum akses KRS",
          reason: result.status,
          questionnaireUrl: result.questionnaireUrl,
        },
        { status: 401 },
      );
    }
    if (result.status === "expired") {
      return NextResponse.json(
        { message: "Session expired at server" },
        { status: 401 },
      );
    }
    if (result.status === "authenticated") {
      return NextResponse.json({ authenticated: true }, { status: 200 });
    }
    return NextResponse.json({ message: "Unknown status" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ message: "Auth check failed" }, { status: 401 });
  }
}
