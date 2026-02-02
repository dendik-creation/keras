import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { envVariable } from "@/lib/utils";
import * as cheerio from "cheerio";
import { axiosScrapClient } from "@/helper/axios_client";
import https from "https";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("external_session");

  if (!sessionCookie) {
    return NextResponse.json(
      { message: "Unauthorized: Sesi habis, silakan login kembali." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const paramsJson = searchParams.get("courses");

  if (!paramsJson) {
    return NextResponse.json(
      { message: "Parameter 'courses' diperlukan." },
      { status: 400 },
    );
  }

  let targetCourses: {
    code: string;
    class: string;
    schedule_submit_id?: string;
  }[] = [];
  try {
    targetCourses = JSON.parse(paramsJson);
  } catch (e) {
    return NextResponse.json(
      { message: "Format JSON salah." },
      { status: 400 },
    );
  }

  const keepAliveAgent = new https.Agent({
    keepAlive: true,
    rejectUnauthorized: false,
  });

  const response = await axiosScrapClient.get(envVariable.KRS_SCHEDULES_FORM, {
    headers: { Cookie: sessionCookie.value },
    httpsAgent: keepAliveAgent,
  });

  const $ = cheerio.load(response.data);
  const alertTexts: string[] = [];
  $(".alert[role='alert']").each((_, el) => {
    const divText = $(el).find("div").text().trim();
    if (divText) {
      alertTexts.push(divText);
    }
  });

  // Return as error because submit war not yet started by university
  if (alertTexts.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Waktu perang KRS belum dimulai",
      },
      { status: 200 },
    );
  }

  const availableSchedulesMap = new Map<string, string>();
  const accordionBodies = $(".accordion-body.p-0.mt-3");

  if (accordionBodies.length > 0) {
    accordionBodies.each((_, item) => {
      const $table = $(item).find("table tbody");
      $table.find("tr").each((_, row) => {
        const $cols = $(row).find("td");
        if ($cols.length >= 3) {
          const $checkbox = $cols.eq(0).find("input[name='makul[]']");
          const scheduleId = $checkbox.val() as string;
          const courseCode = $cols.eq(1).text().trim();
          const courseClass = $cols.eq(2).text().trim();

          if (scheduleId) {
            availableSchedulesMap.set(
              `${courseCode}-${courseClass}`,
              scheduleId,
            );
          }
        }
      });
    });
  }

  const finalSchedules = targetCourses.map((target) => {
    const key = `${target.code}-${target.class}`;
    const foundId = availableSchedulesMap.get(key);

    return {
      code: target.code,
      class: target.class,
      schedule_submit_id: foundId || "",
    };
  });

  return NextResponse.json(
    {
      success: true,
      message: "Sinkronisasi status jadwal berhasil",
      data: finalSchedules,
    },
    { status: 200 },
  );
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("external_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "Unauthorized: Sesi habis, silakan login kembali." },
        { status: 401 },
      );
    }

    // Payload
    const { schedule_ids } = await req.json();

    if (
      !schedule_ids ||
      !Array.isArray(schedule_ids) ||
      schedule_ids.length === 0
    ) {
      return NextResponse.json(
        { message: "Tidak ada jadwal yang dipilih." },
        { status: 400 },
      );
    }

    const keepAliveAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false,
    });

    const headers = {
      Cookie: sessionCookie.value,
      Referer: envVariable.KRS_SCHEDULES_FORM,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const params = new URLSearchParams();

    schedule_ids.forEach((id: string) => {
      params.append("makul[]", id);
    });

    const submitResponse = await axiosScrapClient.post(
      envVariable.KRS_POST_SCHEDULES,
      params,
      {
        headers: headers,
        httpsAgent: keepAliveAgent,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 500,
      },
    );

    let htmlContent = submitResponse.data;
    //  Need redirect from 303 to get alert message
    if (submitResponse.status === 302 || submitResponse.status === 303) {
      const redirectUrl = submitResponse.headers["location"];

      if (redirectUrl) {
        const followResponse = await axiosScrapClient.get(redirectUrl, {
          headers: { Cookie: sessionCookie.value },
          httpsAgent: keepAliveAgent,
        });

        htmlContent = followResponse.data;
      }
    }

    const $ = cheerio.load(htmlContent);
    const messages: string[] = [];

    // alert element with role="alert"
    $(".alert[role='alert']").each((_, el) => {
      const $alert = $(el);
      const $lists = $alert.find("ul");

      if ($lists.length > 0) {
        $lists.each((__, ul) => {
          const $ul = $(ul);

          const headerText = $ul.prev("p").text().trim().toUpperCase();

          let prefix = "";
          if (headerText.includes("BERHASIL")) {
            prefix = "Kelas Tersimpan : ";
          } else if (
            headerText.includes("BENTROK") ||
            headerText.includes("GAGAL") ||
            headerText.includes("PENUH")
          ) {
            prefix = "Gagal : ";
          }

          $ul.find("li").each((___, li) => {
            const liText = $(li).text().trim();
            if (liText) {
              messages.push(`${prefix}${liText}`);
            }
          });
        });
      } else {
        const divContent = $alert.find("div");
        if (divContent.length > 0) {
          messages.push(divContent.text().trim());
        } else {
          messages.push($alert.text().trim());
        }
      }
    });

    const isSuccess =
      messages.length > 0 ||
      submitResponse.status === 302 ||
      submitResponse.status === 200;

    return NextResponse.json({
      success: isSuccess,
      messages: messages,
      status_code: submitResponse.status,
    });
  } catch (error: any) {
    console.error("SUBMIT ERROR:", error.message);
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

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("external_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "Unauthorized: Sesi habis, silakan login kembali." },
        { status: 401 },
      );
    }

    const body = await req.json();
    let targetCourses: { course_code: string; course_class: string }[] = [];
    try {
      targetCourses = JSON.parse(body.courses);
    } catch (e) {
      return NextResponse.json(
        { message: "Format JSON pada 'courses' salah." },
        { status: 400 },
      );
    }

    if (
      !targetCourses ||
      !Array.isArray(targetCourses) ||
      targetCourses.length === 0
    ) {
      return NextResponse.json(
        { message: "Data mata kuliah yang akan dihapus tidak valid." },
        { status: 400 },
      );
    }

    const keepAliveAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false,
    });

    const pageResponse = await axiosScrapClient.get(
      envVariable.KRS_SCHEDULES_RESULT,
      {
        headers: { Cookie: sessionCookie.value },
        httpsAgent: keepAliveAgent,
      },
    );

    const $ = cheerio.load(pageResponse.data);
    const releasableCourseIds: string[] = [];

    const $rows = $("table tbody tr");

    $rows.each((rowIndex, row) => {
      if (rowIndex === 0) return;

      const $cols = $(row).find("td");

      if ($cols.length >= 3) {
        const $col2 = $cols.eq(1);
        const $checkbox = $col2.find(
          "input[type='checkbox'][name='delmakul[]']",
        );
        const checkboxValue = $checkbox.val() as string;

        let courseCode = $col2.find("label").text().trim();
        if (!courseCode) {
          courseCode = $col2.text().trim();
        }

        const $col3 = $cols.eq(2);
        const courseClass = $col3.text().trim();

        const isTarget = targetCourses.find((target) => {
          const targetCode = target.course_code?.trim();
          const targetClass = target.course_class?.trim();

          return targetCode === courseCode && targetClass === courseClass;
        });

        if (isTarget && checkboxValue) {
          releasableCourseIds.push(checkboxValue);
        }
      }
    });

    if (releasableCourseIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ditemukan jadwal yang cocok untuk dihapus.",
        },
        { status: 404 },
      );
    }

    const params = new URLSearchParams();
    releasableCourseIds.forEach((id) => {
      params.append("delmakul[]", id);
    });

    const releaseResponse = await axiosScrapClient.post(
      envVariable.KRS_RELEASE_SCHEDULES,
      params,
      {
        headers: {
          Cookie: sessionCookie.value,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: envVariable.KRS_SCHEDULES_RESULT,
        },
        httpsAgent: keepAliveAgent,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 500,
      },
    );

    // Handle Redirect (302/303) untuk ambil pesan alert
    let htmlContent = releaseResponse.data;
    if (releaseResponse.status === 302 || releaseResponse.status === 303) {
      const redirectUrl = releaseResponse.headers["location"];
      if (redirectUrl) {
        const followResponse = await axiosScrapClient.get(redirectUrl, {
          headers: { Cookie: sessionCookie.value },
          httpsAgent: keepAliveAgent,
        });
        htmlContent = followResponse.data;
      }
    }

    const $result = cheerio.load(htmlContent);
    let alertText = "";

    $result(".alert[role='alert']").each((_, el) => {
      const divText = $result(el).find("div").text().trim();
      if (divText) {
        alertText += divText + " ";
      } else {
        alertText += $result(el).text().trim() + " ";
      }
    });

    const lowerText = alertText.toLowerCase();
    const isSuccess =
      lowerText.includes("berhasil") ||
      lowerText.includes("hapus") ||
      lowerText.includes("dihapus");

    return NextResponse.json({
      success: isSuccess,
      message:
        alertText.trim() ||
        (isSuccess ? "Jadwal berhasil dihapus" : "Gagal menghapus jadwal"),
      deleted_ids: releasableCourseIds,
    });
  } catch (error: any) {
    console.error("DELETE ERROR:", error.message);
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
