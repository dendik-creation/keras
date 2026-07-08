import * as cheerio from "cheerio";
import { envVariable } from "@/lib/utils";
import { axiosScrapClient } from "@/helper/axios_client";
import { createKeepAliveAgent } from "@/lib/server/https-agent";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";

const BATCH_SIZE = 15;
const DELAY_PER_BATCH = 100;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scrape every offered course (grouped per semester) plus each course's
 * day/hour/classroom detail. Detail fetches run in batches to avoid
 * flooding the KRS host.
 */
export async function getOfferingCourses(
  sessionValue: string,
): Promise<OfferingCourse[]> {
  const keepAliveAgent = createKeepAliveAgent({ maxSockets: 20 });

  const headers = {
    Cookie: sessionValue,
    Referer: envVariable.KRS_DASHBOARD_URL,
  };

  const mainResponse = await axiosScrapClient.get(
    envVariable.KRS_GET_SCHEDULES,
    { headers, httpsAgent: keepAliveAgent },
  );

  const offeringCourses = parseOfferingCourses(mainResponse.data);

  await hydrateCourseDetails(
    offeringCourses.flatMap((oc) => oc.courses),
    headers,
    keepAliveAgent,
  );

  return offeringCourses;
}

/** Parse the semester accordions into structured offering courses. */
function parseOfferingCourses(html: string): OfferingCourse[] {
  const $ = cheerio.load(html);
  const offeringCourses: OfferingCourse[] = [];

  $('.accordion-item[style*="border-radius: 5px"]').each((_, accordion) => {
    const $acc = $(accordion);
    const semesterName = $acc.find("h2 button").text().trim();
    const semesterCourses: CourseSchedule[] = [];
    const $table = $acc.find("table");

    $table.find("tbody tr").each((_, row) => {
      const $td = $(row).find("td");
      if ($td.length < 5) return;

      const $lastColumn = $td.last();
      const dataId = $lastColumn.find("a[data-id]").attr("data-id") || "";

      const course: CourseSchedule = {
        code: $td.eq(1).text().trim(),
        class: $td.eq(2).text().trim(),
        course: $td.eq(3).text().trim(),
        category: $td.eq(4).text().trim(),
        sks: $td.eq(5).text().trim(),
        lecture: $td.eq(6).text().trim(),
        schedule_id: dataId,
        day: "",
        hour: "",
        classroom: "",
      };

      if (course.course) semesterCourses.push(course);
    });

    if (semesterCourses.length > 0) {
      const sortedCourses = semesterCourses.sort((a, b) => {
        if (a.code === b.code) {
          return a.class.localeCompare(b.class);
        }
        return a.code.localeCompare(b.code);
      });
      offeringCourses.push({
        latest_update: new Date().toISOString(),
        semester: semesterName,
        courses: sortedCourses,
      });
    }
  });

  return offeringCourses;
}

/** Fetch day/hour/classroom for each course, mutating them in place. */
async function hydrateCourseDetails(
  courses: CourseSchedule[],
  headers: Record<string, string>,
  keepAliveAgent: ReturnType<typeof createKeepAliveAgent>,
): Promise<void> {
  for (let i = 0; i < courses.length; i += BATCH_SIZE) {
    const batch = courses.slice(i, i + BATCH_SIZE);
    console.log(`Get Batch ${i / BATCH_SIZE + 1} (${batch.length} items)`);

    await Promise.all(
      batch.map(async (course) => {
        if (!course.schedule_id) return;
        const formData = new URLSearchParams();
        formData.append("id", course.schedule_id);
        try {
          const detailResponse = await axiosScrapClient.post(
            envVariable.KRS_GET_SCHEDULE_DETAIL,
            formData,
            {
              headers: { ...headers, "X-Requested-With": "XMLHttpRequest" },
              httpsAgent: keepAliveAgent,
            },
          );

          const jsonResponse = detailResponse.data;
          const htmlString = jsonResponse?.data?.jadwal;
          if (htmlString) {
            const $detail = cheerio.load(htmlString, null, false);
            const $tds = $detail("td");
            course.day = $tds.eq(1).find("center").text().trim();
            course.hour = $tds.eq(2).find("center").text().trim();
            course.classroom = $tds.eq(3).find("center").text().trim();
          }
        } catch (err) {
          console.error(`Gagal fetch: ${course.course}`);
        }
      }),
    );
    if (i + BATCH_SIZE < courses.length) {
      await delay(DELAY_PER_BATCH);
    }
  }
}
