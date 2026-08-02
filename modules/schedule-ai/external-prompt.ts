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
 * (ChatGPT, Claude, Gemini, DeepSeek, GLM, Qwen, etc.) using available course catalog and preferences.
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
  // Format: CODE-CLASS|sks|day|hour|lecturer|semester
  const courseLines = coursesToInclude.map((c) => {
    const dayAbbr = DAY_ABBR[c.day] || c.day;
    const hourStr = (c.hour || "").replace(/\s+/g, "");
    return `${c.code}-${c.class}|${c.sks}|${dayAbbr}|${hourStr}|${c.lecture}|${c.semester || ""}`;
  });

  // Build course list for lookup
  const uniqueCourses = new Map<string, string>();
  coursesToInclude.forEach((c) => uniqueCourses.set(c.code, c.course));
  const courseListLines = Array.from(uniqueCourses.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, name]) => `${code} = ${name}`);

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
Kamu adalah asisten akademik ahli yang bertugas merancang kombinasi jadwal kuliah terbaik dan bebas bentrok untuk mahasiswa.

Tugas utama kamu:
- Menganalisis katalog mata kuliah yang tersedia dan preferensi mahasiswa.
- Menghasilkan beberapa pilihan rekomendasi jadwal yang paling optimal.
- Mengutamakan jadwal yang valid, bebas bentrok, dan memenuhi kebutuhan mahasiswa.

---

### ATURAN WAJIB
Kamu WAJIB mematuhi seluruh aturan berikut tanpa terkecuali:
1. DILARANG membuat jadwal bentrok (waktu/jam yang sama pada hari yang sama).
2. DILARANG memilih lebih dari satu kelas untuk mata kuliah yang sama.
3. DILARANG mengarang, menambah, atau mengubah kode/kelas mata kuliah yang tidak ada di data katalog.
4. DILARANG melewatkan mata kuliah wajib jika dipersyaratkan oleh preferensi mahasiswa.
5. WAJIB melakukan verifikasi dan validasi mandiri terhadap seluruh jadwal sebelum memberikan jawaban.
6. WAJIB mengoptimalkan jadwal berdasarkan efisiensi waktu, preferensi dosen, dan kenyamanan mahasiswa (bukan memilih secara acak).

---

### COURSE LIST
${courseListLines.join("\n")}

### AVAILABLE CLASSES
Format: KODE-KELAS|SKS|HARI|JAM|DOSEN|SEMESTER
${courseLines.join("\n")}

---

### FORMAT JAWABAN
1. Jika terdapat nilai "Belum ditentukan" pada bagian PREFERENSI MAHASISWA di bawah, DILARANG LANGSUNG MEMBUAT JADWAL. Ajukan pertanyaan singkat hanya untuk poin yang belum ditentukan tersebut dan tunggu jawaban dari mahasiswa.
2. Jika seluruh preferensi sudah ditentukan, berikan minimal 3 pilihan rekomendasi jadwal (Rekomendasi 1: Paling Seimbang, Rekomendasi 2: Alternatif, Rekomendasi 3: Jadwal Padat).
3. Setiap rekomendasi WAJIB ditulis dengan format berikut (gunakan code block bash untuk daftar identifier):

## Rekomendasi [Nomor]
Alasan: [Penjelasan singkat alasan pemilihan rekomendasi]

\`\`\`bash
KODE1-KELAS1,KODE2-KELAS2,KODE3-KELAS3
\`\`\`

Contoh format keluaran:

## Rekomendasi 1
Alasan: Kombinasi jadwal paling seimbang dengan jeda kuliah minimal.

\`\`\`bash
IFE101-A,IFE103-B,IFE107-C
\`\`\`

## Rekomendasi 2
Alasan: Hari kuliah lebih sedikit sehingga menghemat hari ke kampus.

\`\`\`bash
IFE101-B,IFE103-A,IFE107-C
\`\`\`

## Rekomendasi 3
Alasan: Selesai kuliah lebih awal setiap harinya.

\`\`\`bash
IFE101-A,IFE103-C,IFE107-B
\`\`\`

---

### PREFERENSI MAHASISWA
Berikut adalah status preferensi mahasiswa saat ini:

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

PENTING:
Lakukan verifikasi mandiri terhadap aturan berikut sebelum menjawab:
[✓] Tidak ada jam & hari bentrok
[✓] Tidak ada bentrok waktu
[✓] Tepat satu kelas per mata kuliah
[✓] Memenuhi seluruh preferensi mahasiswa
[✓] Hanya menggunakan identifier resmi dari AVAILABLE CLASSES

Jika masih terdapat nilai "Belum ditentukan" pada daftar preferensi di atas, JANGAN buat rekomendasi jadwal terlebih dahulu. Ajukan pertanyaan terlebih dahulu kepada mahasiswa.`;
}

export type ParseAndReconstructResult = {
  success: boolean;
  courses: CourseSchedule[];
  errors: string[];
  warnings: string[];
  rawIdentifiers: string[];
};

export type RecommendationItem = {
  id: string;
  title: string;
  reason: string;
  rawText: string;
  rawIdentifiers: string[];
  reconstruction: ParseAndReconstructResult;
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
        `Jadwal bentrok antara ${match.code}-${match.class} "${match.course}" (${match.day} ${match.hour}) dan ${conflict.code}-${conflict.class} "${conflict.course}" (${conflict.day} ${conflict.hour}).`,
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

/**
 * Parses single or multiple recommendations from external AI responses.
 * Detects code blocks (e.g. bash blocks) with accompanying reasons or headings.
 */
export function parseMultipleRecommendations(
  input: string,
  offeringCourses: OfferingCourse[],
): RecommendationItem[] {
  if (!input || !input.trim()) return [];

  const codeBlockRegex = /```(?:bash|sh|text|)?\s*\n?([\s\S]*?)\n?```/gi;
  const blocks: { rawCode: string; startIndex: number; endIndex: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(input)) !== null) {
    blocks.push({
      rawCode: match[1].trim(),
      startIndex: match.index,
      endIndex: codeBlockRegex.lastIndex,
    });
  }

  if (blocks.length === 0) {
    const reconstruction = parseAndReconstructSchedule(input, offeringCourses);
    return [
      {
        id: "rec-1",
        title: "Rekomendasi 1",
        reason: "Rekomendasi dari teks yang diimpor.",
        rawText: input.trim(),
        rawIdentifiers: reconstruction.rawIdentifiers,
        reconstruction,
      },
    ];
  }

  const results: RecommendationItem[] = [];

  blocks.forEach((block, idx) => {
    const prevEnd = idx > 0 ? blocks[idx - 1].endIndex : 0;
    const precedingText = input.substring(prevEnd, block.startIndex).trim();

    let title = `Rekomendasi ${idx + 1}`;
    const titleMatch = precedingText.match(/(?:#+\s*|\b)(Rekomendasi\s*#?\s*\d+|Pilihan\s*#?\s*\d+|Recommendation\s*#?\s*\d+)/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/^#+\s*/, "").trim();
    }

    let reason = "";
    const reasonMatch = precedingText.match(/(?:Alasan|Reason)\s*:\s*([^\n]+)/i);
    if (reasonMatch && reasonMatch[1]) {
      reason = reasonMatch[1].trim();
    } else {
      const lines = precedingText.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        reason = lines[lines.length - 1].replace(/^#+\s*/, "").trim();
      }
    }

    if (!reason) {
      reason = `Opsi rekomendasi ke-${idx + 1}`;
    }

    const identifiers = parseCourseIdentifiers(block.rawCode);
    const reconstruction = reconstructScheduleFromCatalog(identifiers, offeringCourses);

    results.push({
      id: `rec-${idx + 1}`,
      title: title || `Rekomendasi ${idx + 1}`,
      reason,
      rawText: block.rawCode,
      rawIdentifiers: identifiers,
      reconstruction,
    });
  });

  return results;
}

