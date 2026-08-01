import * as cheerio from "cheerio";
import { envVariable } from "@/lib/utils";
import { axiosScrapClient } from "@/helper/axios_client";
import { createKeepAliveAgent } from "@/lib/server/https-agent";
import { HttpError } from "@/lib/server/http-error";
import type {
  DeleteTargetCourse,
  SyncTargetCourse,
} from "@/modules/submit/submit.validator";

export type SyncResult =
  | { warStarted: false }
  | {
      warStarted: true;
      schedules: {
        code: string;
        class: string;
        schedule_submit_id: string;
      }[];
    };

export type SubmitResult = {
  isSuccess: boolean;
  messages: string[];
  statusCode: number;
};

export type ReleaseResult =
  | { matched: false }
  | { matched: true; isSuccess: boolean; message: string; deletedIds: string[] };

/**
 * Resolve each target course to its submit-form checkbox id.
 * Returns `warStarted: false` when the KRS war window is not yet open.
 */
export async function syncSchedules(
  sessionValue: string,
  targetCourses: SyncTargetCourse[],
): Promise<SyncResult> {
  const keepAliveAgent = createKeepAliveAgent();

  const response = await axiosScrapClient.get(envVariable.KRS_SCHEDULES_FORM, {
    headers: { Cookie: sessionValue },
    httpsAgent: keepAliveAgent,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 500,
  });

  if (response.status === 302 || response.status === 303) {
    const redirectUrl = response.headers["location"];
    if (redirectUrl?.includes("login")) {
      throw new HttpError(401, "Session expires di kampus, silakan login ulang");
    }
  }

  const $ = cheerio.load(response.data);
  const alertTexts: string[] = [];
  $(".alert[role='alert']").each((_, el) => {
    const divText = $(el).find("div").text().trim();
    if (divText) {
      alertTexts.push(divText);
    }
  });

  // Alert present => war window not open yet
  if (alertTexts.length > 0) {
    return { warStarted: false };
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

  const schedules = targetCourses.map((target) => {
    const key = `${target.code}-${target.class}`;
    const foundId = availableSchedulesMap.get(key);

    return {
      code: target.code,
      class: target.class,
      schedule_submit_id: foundId || "",
    };
  });

  return { warStarted: true, schedules };
}


/** Parse submit-result alerts into prefixed success/fail messages. */
function parseSubmitMessages(htmlContent: string): string[] {
  const $ = cheerio.load(htmlContent);
  const messages: string[] = [];

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

  return messages;
}

/**
 * Release (drop) the target courses from the student's saved KRS.
 * Returns `matched: false` when no saved schedule matches the targets.
 */
export async function releaseSchedules(
  sessionValue: string,
  targetCourses: DeleteTargetCourse[],
): Promise<ReleaseResult> {
  const keepAliveAgent = createKeepAliveAgent();

  const pageResponse = await axiosScrapClient.get(
    envVariable.KRS_SCHEDULES_RESULT,
    {
      headers: { Cookie: sessionValue },
      httpsAgent: keepAliveAgent,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 500,
    },
  );

  if (pageResponse.status === 302 || pageResponse.status === 303) {
    const redirectUrl = pageResponse.headers["location"];
    if (redirectUrl?.includes("login")) {
      throw new HttpError(401, "Session expires di kampus, silakan login ulang");
    }
  }

  const releasableCourseIds = collectReleasableIds(
    pageResponse.data,
    targetCourses,
  );

  if (releasableCourseIds.length === 0) {
    return { matched: false };
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
        Cookie: sessionValue,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: envVariable.KRS_SCHEDULES_RESULT,
      },
      httpsAgent: keepAliveAgent,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 500,
    },
  );

  // Handle Redirect (302/303) to fetch the alert message
  let htmlContent = releaseResponse.data;
  if (releaseResponse.status === 302 || releaseResponse.status === 303) {
    const redirectUrl = releaseResponse.headers["location"];

    if (redirectUrl?.includes("login")) {
      throw new HttpError(401, "Session expires di kampus, silakan login ulang");
    }

    if (redirectUrl) {
      const followResponse = await axiosScrapClient.get(redirectUrl, {
        headers: { Cookie: sessionValue },
        httpsAgent: keepAliveAgent,
      });
      htmlContent = followResponse.data;
    }
  }

  const alertText = parseReleaseAlert(htmlContent);
  const lowerText = alertText.toLowerCase();
  const isSuccess =
    lowerText.includes("berhasil") ||
    lowerText.includes("hapus") ||
    lowerText.includes("dihapus");

  return {
    matched: true,
    isSuccess,
    message:
      alertText.trim() ||
      (isSuccess ? "Jadwal berhasil dihapus" : "Gagal menghapus jadwal"),
    deletedIds: releasableCourseIds,
  };
}

/** Find the checkbox ids of saved courses matching the delete targets. */
function collectReleasableIds(
  html: string,
  targetCourses: DeleteTargetCourse[],
): string[] {
  const $ = cheerio.load(html);
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

  return releasableCourseIds;
}

/** Concatenate release-result alert texts. */
function parseReleaseAlert(htmlContent: string): string {
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

  return alertText;
}

/**
 * Classify a failure message as permanent (non-retryable) or transient.
 * Permanent failures: class full, schedule conflict, duplicate enrollment,
 * validation errors. Wave 2 skips courses whose only failures are permanent.
 */
export function isPermanentFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("penuh") ||           // class full
    lower.includes("bentrok") ||         // schedule conflict
    lower.includes("sudah tersimpan") || // duplicate enrollment
    lower.includes("sudah diambil") ||   // already enrolled
    lower.includes("tidak valid") ||     // validation error
    lower.includes("invalid") ||
    lower.includes("duplikat") ||
    lower.includes("duplicate")
  );
}

/**
 * From the remaining schedule IDs, remove those whose failure messages are
 * all permanent (no point retrying them in Wave 2).
 */
export function filterRetryableScheduleIds(
  remaining: string[],
  messages: string[],
  schedules?: { code: string; class: string; schedule_submit_id: string }[]
): string[] {
  // Build a map: scheduleId -> whether any of its failure messages are permanent
  const permanentIds = new Set<string>();

  messages.forEach((msg) => {
    const isFailMsg = msg.toLowerCase().startsWith("gagal");
    if (!isFailMsg) return;

    if (!isPermanentFailure(msg)) return; // transient — keep retrying

    // Try to identify which schedule ID this message belongs to
    const simMatch = msg.match(/\[ID\s+([^\]]+)\]/i);
    if (simMatch) {
      permanentIds.add(simMatch[1]);
      return;
    }

    // Production format: "Gagal : CODE CLASS ..." — match via schedules map
    const courseMatch = msg.match(/Gagal\s*:\s*([A-Z0-9]+)\s+([A-Z0-9]+)/i);
    if (courseMatch && schedules) {
      const [, code, klass] = courseMatch;
      const found = schedules.find((s) => s.code === code && s.class === klass);
      if (found && found.schedule_submit_id) {
        permanentIds.add(found.schedule_submit_id);
      }
    }
  });

  return remaining.filter((id) => !permanentIds.has(id));
}

/** Filter out schedule IDs that succeeded in attempt messages. */
export function filterSucceededScheduleIds(
  currentRemaining: string[],
  messages: string[],
  schedules?: { code: string; class: string; schedule_submit_id: string }[]
): string[] {
  const succeeded = new Set<string>();

  messages.forEach((msg) => {
    const isSuccessMsg = msg.includes("Kelas Tersimpan") || msg.toUpperCase().includes("BERHASIL");
    if (!isSuccessMsg) return;

    const simMatch = msg.match(/\[ID\s+([^\]]+)\]/i);
    if (simMatch) {
      succeeded.add(simMatch[1]);
      return;
    }

    const courseMatch = msg.match(/Tersimpan\s*:\s*([A-Z0-9]+)\s+([A-Z0-9]+)/i);
    if (courseMatch && schedules) {
      const [, code, klass] = courseMatch;
      const found = schedules.find((s) => s.code === code && s.class === klass);
      if (found && found.schedule_submit_id) {
        succeeded.add(found.schedule_submit_id);
      }
    }
  });

  return currentRemaining.filter((id) => !succeeded.has(id));
}
