import type { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import type { AiPreference, CourseWithSemester, OptimizationGoal } from "@/modules/schedule-ai/schedule-ai.types";
import { prefilterCourses } from "@/modules/schedule-ai/schedule-ai.utils";
import { checkConflict } from "@/helper/frontend_helper";

export const DEFAULT_AI_PREFERENCE: AiPreference = {
  target_sks: { mode: "max", value: null },
  preferred_semester: null,
  preferred_days: [],
  earliest_start: "08:00",
  latest_end: "15:00",
  preferred_time: "none",
  max_idle_minutes: null,
  preferred_courses: [],
  avoid_courses: [],
  preferred_lecturers: [],
  avoid_lecturers: [],
  goal: "balanced",
};

const DAY_ABBR: Record<string, string> = {
  Senin: "Sen",
  Selasa: "Sel",
  Rabu: "Rab",
  Kamis: "Kam",
  Jumat: "Jum",
  Sabtu: "Sab",
  Minggu: "Min",
};

const GOAL_INDONESIAN_LABELS: Record<OptimizationGoal, string> = {
  balanced: "Jadwal seimbang (balanced)",
  compact: "Hari kuliah padat / jeda minimal (compact)",
  less_days: "Hari kuliah sesedikit mungkin (less_days)",
  morning: "Kelas pagi hari (morning)",
  afternoon: "Kelas siang/sore (afternoon)",
  fast_graduation: "Lulus cepat / SKS maksimal (fast_graduation)",
};

/**
 * Builds an optimized Bahasa Indonesia prompt for external AI providers
 * (ChatGPT, Claude, Gemini, DeepSeek, GLM, etc.) using available course catalog and preferences.
 */
export function buildExternalAiPrompt(
  offeringCourses: OfferingCourse[],
  preference?: Partial<AiPreference>,
): string {
  const allCourses: CourseWithSemester[] = offeringCourses.flatMap((group) =>
    group.courses.map((course) => ({ ...course, semester: group.semester })),
  );

  const isCustomPref = !!preference && Object.keys(preference).length > 0;
  const prefObj: AiPreference = {
    ...DEFAULT_AI_PREFERENCE,
    ...preference,
  };

  const candidateCourses = isCustomPref ? prefilterCourses(allCourses, prefObj) : allCourses;
  const coursesToInclude = candidateCourses.length > 0 ? candidateCourses : allCourses;

  // Build compact lines for each available course option
  // Format: CODE-CLASS|sks|day|hour|lecturer
  const courseLines = coursesToInclude.map((c) => {
    const dayAbbr = DAY_ABBR[c.day] || c.day;
    const hourStr = (c.hour || "").replace(/\s+/g, "");
    return `${c.code}-${c.class}|${c.sks}|${dayAbbr}|${hourStr}|${c.lecture}`;
  });

  // Dynamic preference status
  const semVal = prefObj.preferred_semester ? prefObj.preferred_semester : "Belum ditentukan";
  const sksVal =
    prefObj.target_sks.mode === "custom" && prefObj.target_sks.value
      ? `${prefObj.target_sks.value} SKS`
      : isCustomPref && prefObj.target_sks.mode === "max"
        ? "Maksimal (24 SKS)"
        : "Belum ditentukan";

  const daysVal =
    prefObj.preferred_days && prefObj.preferred_days.length > 0
      ? prefObj.preferred_days.join(", ")
      : "Belum ditentukan";

  const startVal = isCustomPref ? prefObj.earliest_start : "Belum ditentukan";
  const endVal = isCustomPref ? prefObj.latest_end : "Belum ditentukan";

  const timeVal =
    prefObj.preferred_time === "morning"
      ? "Kelas Pagi"
      : prefObj.preferred_time === "afternoon"
        ? "Kelas Siang/Sore"
        : isCustomPref && prefObj.preferred_time === "none"
          ? "Tanpa Preferensi Khusus"
          : "Belum ditentukan";

  const idleVal =
    prefObj.max_idle_minutes !== null ? `${prefObj.max_idle_minutes} menit` : "Belum ditentukan";

  const prefCoursesVal =
    prefObj.preferred_courses && prefObj.preferred_courses.length > 0
      ? prefObj.preferred_courses.join(", ")
      : "Belum ditentukan";

  const avoidCoursesVal =
    prefObj.avoid_courses && prefObj.avoid_courses.length > 0
      ? prefObj.avoid_courses.join(", ")
      : "Belum ditentukan";

  const prefLecVal =
    prefObj.preferred_lecturers && prefObj.preferred_lecturers.length > 0
      ? prefObj.preferred_lecturers.join(", ")
      : "Belum ditentukan";

  const avoidLecVal =
    prefObj.avoid_lecturers && prefObj.avoid_lecturers.length > 0
      ? prefObj.avoid_lecturers.join(", ")
      : "Belum ditentukan";

  const goalVal = isCustomPref ? GOAL_INDONESIAN_LABELS[prefObj.goal] || "Belum ditentukan" : "Belum ditentukan";

  return `### TUJUAN
Kamu adalah asisten akademik yang bertugas membantu saya memilih kombinasi jadwal kuliah terbaik.

Tugas kamu:
- Memilih kelas terbaik dari daftar mata kuliah yang tersedia.
- Menghindari jadwal bentrok (hari dan jam sama).
- Memilih hanya satu kelas untuk setiap mata kuliah yang diambil.
- Mengikuti preferensi mahasiswa.
- Apabila preferensi belum lengkap, tanyakan terlebih dahulu sebelum membuat jadwal.

---

### DATA MATA KULIAH
Format: KODE-KELAS|SKS|HARI|JAM|DOSEN
${courseLines.join("\n")}

---

### CARA MENJAWAB
1. Jika seluruh preferensi mahasiswa sudah diketahui (tidak ada nilai "Belum ditentukan"), langsung pilih kombinasi jadwal terbaik.
2. Jika masih terdapat nilai "Belum ditentukan", JANGAN langsung membuat jadwal. Ajukan pertanyaan terlebih dahulu hingga preferensi cukup jelas.
3. Ketika menghasilkan jadwal, kamu HANYA boleh mengeluarkan daftar course identifier yang dipisahkan koma.
Strictly NO Markdown, NO penjelasan, NO bullet, NO kalimat tambahan, NO code block. Hanya daftar course identifier.

Contoh output hasil jadwal:
IFE101-A,IFE103-B,IFE107-A

---

### PREFERENSI MAHASISWA
Berikut adalah status preferensi saya saat ini:

1. Semester: ${semVal}
2. Target SKS: ${sksVal}
3. Jam kuliah paling awal: ${startVal}
4. Jam kuliah paling akhir: ${endVal}
5. Hari kuliah disukai: ${daysVal}
6. Preferensi waktu: ${timeVal}
7. Maksimal jeda antar kelas: ${idleVal}
8. Mata kuliah diprioritaskan: ${prefCoursesVal}
9. Mata kuliah dihindari: ${avoidCoursesVal}
10. Dosen diprioritaskan: ${prefLecVal}
11. Dosen dihindari: ${avoidLecVal}
12. Tujuan utama: ${goalVal}

Pilihan tujuan utama jika belum ditentukan:
- Hari kuliah sesedikit mungkin
- Pulang lebih awal
- Masuk lebih siang
- Jadwal seimbang
- Dosen terbaik
- Kombinasi terbaik

Jika masih terdapat nilai "Belum ditentukan" pada daftar preferensi di atas, tanyakan hanya bagian tersebut kepada saya sebelum membuat jadwal.`;
}

export type ParseAndReconstructResult = {
  success: boolean;
  courses: CourseSchedule[];
  errors: string[];
  warnings: string[];
  rawIdentifiers: string[];
};

/**
 * Normalizes input string and extracts course identifiers (e.g. IFE101-A, IFE103-B).
 * Supports commas, newlines, spaces, semicolons, tabs, and mixed separators.
 */
export function parseCourseIdentifiers(input: string): string[] {
  if (!input || !input.trim()) return [];

  let cleaned = input.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  const rawTokens = cleaned.split(/[\n,;\t\r]+/);

  const identifiers: string[] = [];
  const seen = new Set<string>();

  for (const rawToken of rawTokens) {
    let token = rawToken.trim().replace(/^[-*•\d+.\s]+/, "").replace(/['"`]/g, "").trim();
    if (!token) continue;

    const subTokens = token.split(/\s+/);
    for (const sub of subTokens) {
      const trimmed = sub.trim().replace(/['"`]/g, "");
      if (trimmed && !seen.has(trimmed.toUpperCase())) {
        seen.add(trimmed.toUpperCase());
        identifiers.push(trimmed);
      }
    }
  }

  return identifiers;
}

/**
 * Reconstructs complete CourseSchedule objects from catalog based on parsed course identifiers.
 * Validates course existence, duplicates, and time conflicts.
 */
export function reconstructScheduleFromCatalog(
  identifiers: string[],
  offeringCourses: OfferingCourse[],
): ParseAndReconstructResult {
  if (identifiers.length === 0) {
    return {
      success: false,
      courses: [],
      errors: ["Format tidak valid. Input tidak boleh kosong."],
      warnings: [],
      rawIdentifiers: [],
    };
  }

  const catalogCourses: CourseSchedule[] = offeringCourses.flatMap((group) =>
    group.courses.map((course) => ({
      ...course,
      semester: course.semester || group.semester,
    })),
  );

  const foundCourses: CourseSchedule[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenCourseCodes = new Set<string>();

  for (const rawId of identifiers) {
    let match: CourseSchedule | undefined;

    const formattedId = rawId.toUpperCase();
    const parts = formattedId.split(/[-_\s]+/);

    if (parts.length >= 2) {
      const codePart = parts[0];
      const classPart = parts.slice(1).join("");
      match = catalogCourses.find(
        (c) =>
          c.code.toUpperCase() === codePart &&
          c.class.toUpperCase() === classPart,
      );
    }

    if (!match) {
      match = catalogCourses.find(
        (c) =>
          `${c.code}${c.class}`.toUpperCase() === formattedId ||
          c.code.toUpperCase() === formattedId,
      );
    }

    if (!match) {
      match = catalogCourses.find(
        (c) =>
          formattedId.startsWith(c.code.toUpperCase()) &&
          formattedId.substring(c.code.length) === c.class.toUpperCase(),
      );
    }

    if (!match) {
      errors.push(`Mata kuliah tidak ditemukan: Mata kuliah / kelas '${rawId}' tidak ada dalam katalog.`);
      continue;
    }

    if (seenCourseCodes.has(match.code.toUpperCase())) {
      errors.push(
        `Terdapat mata kuliah duplikat: Terdeteksi pilihan ganda untuk mata kuliah '${match.code}' (${match.course}).`,
      );
      continue;
    }

    const conflict = checkConflict(match, foundCourses);
    if (conflict) {
      errors.push(
        `Jadwal bentrok antara ${match.code}-${match.class} (${match.day} ${match.hour}) dan ${conflict.code}-${conflict.class} (${conflict.day} ${conflict.hour}).`,
      );
      continue;
    }

    seenCourseCodes.add(match.code.toUpperCase());
    foundCourses.push(match);
  }

  if (errors.length > 0) {
    return {
      success: false,
      courses: [],
      errors,
      warnings,
      rawIdentifiers: identifiers,
    };
  }

  return {
    success: true,
    courses: foundCourses,
    errors: [],
    warnings,
    rawIdentifiers: identifiers,
  };
}

export function parseAndReconstructSchedule(
  input: string,
  offeringCourses: OfferingCourse[],
): ParseAndReconstructResult {
  const identifiers = parseCourseIdentifiers(input);
  return reconstructScheduleFromCatalog(identifiers, offeringCourses);
}
