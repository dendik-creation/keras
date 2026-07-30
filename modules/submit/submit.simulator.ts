import { logger } from "@/lib/logger";
import {
  getWarTestProbabilities,
  getWarTestSeed,
  type WarTestOutcome,
} from "@/lib/server/war-test-mode";
import type {
  DeleteTargetCourse,
  SyncTargetCourse,
} from "@/modules/submit/submit.validator";
import type { ReleaseResult, SubmitResult, SyncResult } from "@/modules/submit/submit.service";

const SIM_ID_PREFIX = "SIM-";

/** Per-session "already secured" memory, held for the life of this server process. */
const securedBySession = new Map<string, Set<string>>();

const courseKey = (code: string, klass: string) => `${code}-${klass}`;
const simScheduleId = (code: string, klass: string) => `${SIM_ID_PREFIX}${code}-${klass}`;

function parseSimScheduleId(scheduleId: string): { code: string; klass: string } | null {
  if (!scheduleId.startsWith(SIM_ID_PREFIX)) return null;
  const rest = scheduleId.slice(SIM_ID_PREFIX.length);
  const idx = rest.lastIndexOf("-");
  if (idx === -1) return null;
  return { code: rest.slice(0, idx), klass: rest.slice(idx + 1) };
}

function getSecuredSet(sessionValue: string): Set<string> {
  let set = securedBySession.get(sessionValue);
  if (!set) {
    set = new Set();
    securedBySession.set(sessionValue, set);
  }
  return set;
}

/** mulberry32 — small deterministic PRNG so WAR_TEST_SEED reproduces identical runs. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const configuredSeed = getWarTestSeed();
const rng: () => number =
  configuredSeed !== undefined ? mulberry32(configuredSeed) : Math.random;

function randomBetween(min: number, max: number): number {
  return Math.floor(min + rng() * (max - min));
}

function rollOutcome(): WarTestOutcome {
  const probabilities = getWarTestProbabilities();
  const roll = rng();
  let acc = 0;
  for (const outcome of Object.keys(probabilities) as WarTestOutcome[]) {
    acc += probabilities[outcome];
    if (roll < acc) return outcome;
  }
  return "success";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Simulated GET /api/submit — resolves each target course to a synthetic submit id. */
export async function simulateSyncSchedules(
  sessionValue: string,
  targetCourses: SyncTargetCourse[],
): Promise<SyncResult> {
  const secured = getSecuredSet(sessionValue);

  const schedules = targetCourses.map((target) => {
    const key = courseKey(target.code, target.class);
    const simId = simScheduleId(target.code, target.class);
    const isSecured = secured.has(key) || secured.has(simId);
    return {
      code: target.code,
      class: target.class,
      schedule_submit_id: isSecured ? "" : simId,
    };
  });

  logger.log("[WAR_TEST] sync", {
    session: sessionValue.slice(0, 8),
    count: schedules.length,
  });

  return { warStarted: true, schedules };
}

/** Simulated POST /api/submit — realistic latency + configurable outcome roll per course. */
export async function simulateSubmitSchedules(
  sessionValue: string,
  scheduleIds: string[],
): Promise<SubmitResult> {
  await sleep(randomBetween(300, 1500));

  const secured = getSecuredSet(sessionValue);
  const messages: string[] = [];

  for (const scheduleId of scheduleIds) {
    const parsed = parseSimScheduleId(scheduleId);
    const key = parsed ? courseKey(parsed.code, parsed.klass) : scheduleId;

    if (secured.has(scheduleId) || secured.has(key)) {
      messages.push(`Kelas Tersimpan : [ID ${scheduleId}] - Mata kuliah sudah tersimpan`);
      continue;
    }

    const outcome = rollOutcome();
    switch (outcome) {
      case "success":
        secured.add(scheduleId);
        secured.add(key);
        messages.push(`Kelas Tersimpan : [ID ${scheduleId}] - Mata kuliah berhasil disimpan (Test Mode)`);
        break;
      case "class_full":
        messages.push(`Gagal : [ID ${scheduleId}] kelas penuh (Test Mode)`);
        break;
      case "time_conflict":
        messages.push(`Gagal : [ID ${scheduleId}] bentrok jadwal (Test Mode)`);
        break;
      case "server_busy":
        messages.push(`Gagal : [ID ${scheduleId}] server sibuk, coba lagi (Test Mode)`);
        break;
      case "network_timeout":
        break;
    }

    logger.log("[WAR_TEST] submit outcome", { scheduleId, outcome });
  }

  return {
    isSuccess: messages.length > 0,
    messages,
    statusCode: messages.length > 0 ? 200 : 504,
  };
}

/** Simulated DELETE /api/submit — release only courses this session actually secured. */
export async function simulateReleaseSchedules(
  sessionValue: string,
  targetCourses: DeleteTargetCourse[],
): Promise<ReleaseResult> {
  const secured = getSecuredSet(sessionValue);

  const matched = targetCourses.filter((target) =>
    secured.has(courseKey(target.course_code, target.course_class)),
  );

  if (matched.length === 0) {
    return { matched: false };
  }

  const deletedIds = matched.map((target) => {
    const key = courseKey(target.course_code, target.course_class);
    secured.delete(key);
    return simScheduleId(target.course_code, target.course_class);
  });

  logger.log("[WAR_TEST] release", { session: sessionValue.slice(0, 8), deletedIds });

  return {
    matched: true,
    isSuccess: true,
    message: "Jadwal berhasil dihapus (simulasi)",
    deletedIds,
  };
}
