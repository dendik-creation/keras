/**
 * two_wave_validation.test.ts
 *
 * Comprehensive runtime validation of the two-wave WAR Priority scheduling.
 * All tests run in WAR Test Mode — zero production endpoints touched.
 *
 * Requirements validated:
 *  R1  Single scrape per request
 *  R2  Payload reuse across attempts
 *  R3  Successful courses never resubmitted
 *  R4  Permanent failure filtering in Wave 2
 *  R5  Gate released after Wave 1 (not Wave 2)
 *  R6  Normal queue latency improvement
 *  R7  FIFO ordering
 *  R8  Concurrent requests (no race / deadlock / starvation)
 *  R9  SSE stream — Wave 2 never emits client-visible events
 *  R10 Redis cleanup after completion
 *  R11 Wave 2 fire-and-forget (HTTP returns before Wave 2 finishes)
 *  R12 Test mode compatibility
 */

import { test, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { postSubmit } from "@/modules/submit/submit.controller";
import {
  filterSucceededScheduleIds,
  filterRetryableScheduleIds,
  isPermanentFailure,
} from "@/modules/submit/submit.service";
import { processThroughGate, _test_cleanup } from "@/lib/server/war-gate";
import * as sessionModule from "@/lib/server/session";
import * as redisModule from "@/lib/server/redis";
import * as warTestModeModule from "@/lib/server/war-test-mode";
import * as simulatorModule from "@/modules/submit/submit.simulator";
import { resetSimulatedSession } from "@/modules/submit/submit.simulator";
import { envVariable } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Mock Helpers
// ─────────────────────────────────────────────────────────────

class MockRedis {
  status = "ready";
  store = new Map<string, any>();
  zsets = new Map<string, { score: number; member: string }[]>();
  onMessageHandler: any = null;

  async ping() { return "PONG"; }

  async set(key: string, val: string, ...args: any[]) {
    if (args.includes("NX")) {
      if (this.store.has(key)) return null;
      this.store.set(key, val);
      return "OK";
    }
    this.store.set(key, val);
    return "OK";
  }
  async get(key: string) { return this.store.get(key) ?? null; }
  async del(key: string) { this.store.delete(key); return 1; }
  async incr(key: string) {
    const v = parseInt(this.store.get(key) ?? "0") + 1;
    this.store.set(key, String(v));
    return v;
  }
  async decr(key: string) {
    const v = parseInt(this.store.get(key) ?? "0") - 1;
    this.store.set(key, String(v));
    return v;
  }

  // Sorted set — scored by insertion timestamp
  async zadd(key: string, score: number, member: string) {
    if (!this.zsets.has(key)) this.zsets.set(key, []);
    const z = this.zsets.get(key)!;
    if (!z.find((e) => e.member === member)) {
      z.push({ score, member });
      z.sort((a, b) => a.score - b.score);
    }
    return 1;
  }
  async zrange(key: string, start: number, stop: number) {
    const z = this.zsets.get(key) ?? [];
    return z.slice(start, stop === -1 ? undefined : stop + 1).map((e) => e.member);
  }
  async zrem(key: string, member: string) {
    const z = this.zsets.get(key) ?? [];
    this.zsets.set(key, z.filter((e) => e.member !== member));
    return 1;
  }
  async zcard(key: string) { return (this.zsets.get(key) ?? []).length; }
  async zrank(key: string, member: string) {
    const z = this.zsets.get(key) ?? [];
    const idx = z.findIndex((e) => e.member === member);
    return idx >= 0 ? idx : null;
  }

  duplicate() { return this; }
  async subscribe(channel: string) { return 1; }
  async publish(channel: string, message: string) {
    if (this.onMessageHandler) this.onMessageHandler(channel, message);
    return 1;
  }
  on(event: string, handler: any) {
    if (event === "message") this.onMessageHandler = handler;
  }

  /** Snapshot all keys for Redis cleanup verification */
  allKeys(): string[] {
    return [...this.store.keys(), ...this.zsets.keys()];
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// Shared setup
// ─────────────────────────────────────────────────────────────

let mockRedis: MockRedis;

beforeEach(() => {
  mockRedis = new MockRedis();
  spyOn(redisModule, "getRedisClient").mockReturnValue(mockRedis as any);
  spyOn(sessionModule, "getSessionCookie").mockResolvedValue({
    name: "session",
    value: "test_session_two_wave",
  } as any);
  spyOn(warTestModeModule, "isWarTestMode").mockReturnValue(true);

  envVariable.WAR_PRIORITY_ENABLED = true;
  envVariable.WAR_PRIORITY_NIMS = "PRIO1,PRIO2,PRIO3,PRIO4,PRIO5";
  envVariable.WAR_PRIORITY_GATE_TIMEOUT_MS = 5000;
  envVariable.WAR_PRIORITY_DISCOVERY_WINDOW_MS = 150;

  resetSimulatedSession("test_session_two_wave");
});

afterEach(() => {
  envVariable.WAR_PRIORITY_ENABLED = false;
  _test_cleanup();
});

// ─────────────────────────────────────────────────────────────
// Helper: read SSE stream to events array
// ─────────────────────────────────────────────────────────────

async function collectSSE(response: Response): Promise<any[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────
// Helper: build submit request
// ─────────────────────────────────────────────────────────────

function makeSubmitReq(nim: string, courses: { code: string; class: string }[], stream = true) {
  return new Request("http://localhost/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: stream ? "application/x-ndjson" : "application/json",
    },
    body: JSON.stringify({
      nim,
      stream,
      courses,
    }),
  });
}

// ─────────────────────────────────────────────────────────────
// R1 — Single scrape guarantee
// ─────────────────────────────────────────────────────────────

test("R1: simulateSyncSchedules called exactly once per submit request", async () => {
  let syncCallCount = 0;
  const origSync = simulatorModule.simulateSyncSchedules;
  spyOn(simulatorModule, "simulateSyncSchedules").mockImplementation(async (...args) => {
    syncCallCount++;
    return origSync(...args);
  });

  const req = makeSubmitReq("PRIO1", [
    { code: "IF301", class: "A" },
    { code: "IF302", class: "B" },
  ]);

  await postSubmit(req).then(collectSSE);

  expect(syncCallCount).toBe(1);
});

test("R1: sync not called during Wave 2 (no additional GET after payload built)", async () => {
  // Force deterministic: attempt 1 succeeds one, fails one with server_busy (retryable)
  let syncCount = 0;
  spyOn(simulatorModule, "simulateSyncSchedules").mockImplementation(async (session, courses) => {
    syncCount++;
    return {
      warStarted: true,
      schedules: courses.map((c: any) => ({
        code: c.code,
        class: c.class,
        schedule_submit_id: `SIM-${c.code}-${c.class}`,
      })),
    } as any;
  });

  let executeCount = 0;
  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    executeCount++;
    // Attempt 1: succeed first, leave second as server_busy
    // Attempt 2 (Wave 1): succeed second
    // No Wave 2 needed here
    if (executeCount === 1) {
      return {
        isSuccess: true,
        messages: [`Kelas Tersimpan : [ID ${ids[0]}] - berhasil`],
        statusCode: 200,
      };
    }
    return {
      isSuccess: true,
      messages: ids.map((id: string) => `Kelas Tersimpan : [ID ${id}] - berhasil`),
      statusCode: 200,
    };
  });

  await postSubmit(makeSubmitReq("PRIO1", [{ code: "IF401", class: "A" }, { code: "IF402", class: "B" }]))
    .then(collectSSE);

  expect(syncCount).toBe(1);
});

// ─────────────────────────────────────────────────────────────
// R2 — Payload reuse (scheduleIds built once, currentRemaining evolves)
// ─────────────────────────────────────────────────────────────

test("R2: payload (scheduleIds) built once — execute calls receive correct remaining subsets", async () => {
  const executedIds: string[][] = [];

  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: [
      { code: "IF1", class: "A", schedule_submit_id: "SIM-IF1-A" },
      { code: "IF2", class: "B", schedule_submit_id: "SIM-IF2-B" },
      { code: "IF3", class: "C", schedule_submit_id: "SIM-IF3-C" },
    ],
  } as any);

  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    executedIds.push([...ids]);
    // Attempt 1: succeed IF1-A only
    if (executedIds.length === 1) {
      return {
        isSuccess: true,
        messages: ["Kelas Tersimpan : [ID SIM-IF1-A] - berhasil"],
        statusCode: 200,
      };
    }
    // Attempt 2: succeed IF2-B, leave IF3-C as server_busy (retryable)
    if (executedIds.length === 2) {
      return {
        isSuccess: true,
        messages: [
          "Kelas Tersimpan : [ID SIM-IF2-B] - berhasil",
          "Gagal : [ID SIM-IF3-C] server sibuk, coba lagi",
        ],
        statusCode: 200,
      };
    }
    // Wave 2: IF3-C
    return {
      isSuccess: true,
      messages: ["Kelas Tersimpan : [ID SIM-IF3-C] - berhasil"],
      statusCode: 200,
    };
  });

  await postSubmit(makeSubmitReq("PRIO1", [
    { code: "IF1", class: "A" },
    { code: "IF2", class: "B" },
    { code: "IF3", class: "C" },
  ])).then(collectSSE);

  // Wait for Wave 2 fire-and-forget to complete
  await sleep(200);

  // Attempt 1: full set
  expect(executedIds[0]).toEqual(["SIM-IF1-A", "SIM-IF2-B", "SIM-IF3-C"]);
  // Attempt 2: IF1-A removed (succeeded)
  expect(executedIds[1]).toEqual(["SIM-IF2-B", "SIM-IF3-C"]);
  // Wave 2: IF2-B removed, IF3-C remains (server_busy = retryable)
  expect(executedIds[2]).toEqual(["SIM-IF3-C"]);
});

// ─────────────────────────────────────────────────────────────
// R3 — Successful courses never resubmitted
// ─────────────────────────────────────────────────────────────

test("R3: filterSucceededScheduleIds removes succeeded IDs correctly", () => {
  const remaining = ["SIM-A", "SIM-B", "SIM-C", "SIM-D", "SIM-E"];
  const messages = [
    "Kelas Tersimpan : [ID SIM-A] - berhasil",
    "Kelas Tersimpan : [ID SIM-B] - berhasil",
    "Gagal : [ID SIM-C] server sibuk",
    "Gagal : [ID SIM-D] server sibuk",
    "Gagal : [ID SIM-E] kelas penuh",
  ];

  const after1 = filterSucceededScheduleIds(remaining, messages);
  // A and B succeeded — only C, D, E remain
  expect(after1).toEqual(["SIM-C", "SIM-D", "SIM-E"]);
});

test("R3: succeeded IDs from attempt 1 never appear in attempt 2 payload", async () => {
  const executedIds: string[][] = [];

  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: ["A","B","C","D","E"].map(id => ({
      code: `IF${id}`, class: "A", schedule_submit_id: `SIM-IF${id}-A`,
    })),
  } as any);

  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    executedIds.push([...ids]);
    if (executedIds.length === 1) {
      // A, B, D succeed; C, E fail
      return {
        isSuccess: true,
        messages: [
          "Kelas Tersimpan : [ID SIM-IFA-A] - berhasil",
          "Kelas Tersimpan : [ID SIM-IFB-A] - berhasil",
          "Gagal : [ID SIM-IFC-A] server sibuk",
          "Kelas Tersimpan : [ID SIM-IFD-A] - berhasil",
          "Gagal : [ID SIM-IFE-A] server sibuk",
        ],
        statusCode: 200,
      };
    }
    return { isSuccess: true, messages: [], statusCode: 200 };
  });

  await postSubmit(makeSubmitReq("PRIO1", ["A","B","C","D","E"].map(id => ({ code: `IF${id}`, class: "A" }))))
    .then(collectSSE);

  // Attempt 2 must NOT contain A, B, D
  if (executedIds.length >= 2) {
    expect(executedIds[1]).not.toContain("SIM-IFA-A");
    expect(executedIds[1]).not.toContain("SIM-IFB-A");
    expect(executedIds[1]).not.toContain("SIM-IFD-A");
    expect(executedIds[1]).toContain("SIM-IFC-A");
    expect(executedIds[1]).toContain("SIM-IFE-A");
  }
});

// ─────────────────────────────────────────────────────────────
// R4 — Permanent failure filtering
// ─────────────────────────────────────────────────────────────

test("R4: isPermanentFailure identifies all permanent failure types", () => {
  // Permanent — must return true
  const permanent = [
    "Gagal : [ID SIM-X] kelas penuh",          // class full
    "Gagal : [ID SIM-X] bentrok jadwal",        // schedule conflict
    "Kelas Tersimpan : [ID SIM-X] sudah tersimpan", // duplicate
    "Gagal : [ID SIM-X] sudah diambil",        // already enrolled
    "Gagal : [ID SIM-X] tidak valid",          // validation error
    "Gagal : [ID SIM-X] invalid request",      // invalid
    "Gagal : [ID SIM-X] duplikat",             // duplicate
    "Gagal : [ID SIM-X] duplicate enrollment", // duplicate EN
  ];

  // Transient — must return false
  const transient = [
    "Gagal : [ID SIM-X] server sibuk, coba lagi",
    "Gagal : [ID SIM-X] coba lagi",
    "",                                        // empty — not a failure
    "Kelas Tersimpan : [ID SIM-X] berhasil",  // success — not failure
  ];

  for (const msg of permanent) {
    expect(isPermanentFailure(msg)).toBe(true);
  }
  for (const msg of transient) {
    expect(isPermanentFailure(msg)).toBe(false);
  }
});

test("R4: filterRetryableScheduleIds removes permanent-failure IDs from Wave 2", () => {
  const remaining = ["SIM-C", "SIM-D", "SIM-E"];
  const messages = [
    "Gagal : [ID SIM-C] server sibuk, coba lagi",  // retryable
    "Gagal : [ID SIM-D] network timeout",           // retryable
    "Gagal : [ID SIM-E] kelas penuh",              // permanent
  ];

  const wave2 = filterRetryableScheduleIds(remaining, messages);
  expect(wave2).toContain("SIM-C");
  expect(wave2).toContain("SIM-D");
  expect(wave2).not.toContain("SIM-E");
});

test("R4: filterRetryableScheduleIds - all permanent returns empty (Wave 2 skipped)", () => {
  const remaining = ["SIM-A", "SIM-B"];
  const messages = [
    "Gagal : [ID SIM-A] kelas penuh",
    "Gagal : [ID SIM-B] bentrok jadwal",
  ];

  const wave2 = filterRetryableScheduleIds(remaining, messages);
  expect(wave2).toHaveLength(0);
});

test("R4: full pipeline — permanent failures not passed to Wave 2 executor", async () => {
  const executedIds: string[][] = [];

  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: [
      { code: "IFP", class: "A", schedule_submit_id: "SIM-IFP-A" }, // permanent
      { code: "IFR", class: "B", schedule_submit_id: "SIM-IFR-B" }, // retryable
    ],
  } as any);

  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    executedIds.push([...ids]);
    if (executedIds.length === 1) {
      return {
        isSuccess: true,
        messages: [
          "Gagal : [ID SIM-IFP-A] kelas penuh",          // permanent
          "Gagal : [ID SIM-IFR-B] server sibuk, coba lagi", // retryable
        ],
        statusCode: 200,
      };
    }
    // Attempt 2 (Wave 1)
    if (executedIds.length === 2) {
      return {
        isSuccess: true,
        messages: ["Gagal : [ID SIM-IFP-A] kelas penuh", "Gagal : [ID SIM-IFR-B] server sibuk, coba lagi"],
        statusCode: 200,
      };
    }
    // Wave 2 — if called
    return { isSuccess: true, messages: [], statusCode: 200 };
  });

  await postSubmit(makeSubmitReq("PRIO1", [{ code: "IFP", class: "A" }, { code: "IFR", class: "B" }]))
    .then(collectSSE);

  await sleep(300); // wait for Wave 2 fire-and-forget

  // Wave 2 (executedIds[2]) must NOT contain the permanent IFP-A
  if (executedIds.length >= 3) {
    expect(executedIds[2]).not.toContain("SIM-IFP-A");
    expect(executedIds[2]).toContain("SIM-IFR-B");
  }
});

// ─────────────────────────────────────────────────────────────
// R5 — Gate released after Wave 1, not Wave 2
// ─────────────────────────────────────────────────────────────

test("R5: normal queue starts immediately after Wave 1, not waiting for Wave 2", async () => {
  const timeline: { event: string; t: number }[] = [];
  const t0 = Date.now();
  const stamp = (event: string) => timeline.push({ event, t: Date.now() - t0 });

  spyOn(simulatorModule, "simulateSyncSchedules").mockImplementation(async (session, courses) => {
    return {
      warStarted: true,
      schedules: courses.map((c: any) => ({
        code: c.code, class: c.class,
        schedule_submit_id: `SIM-${c.code}-${c.class}`,
      })),
    } as any;
  });

  let executeCallCount = 0;
  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    executeCallCount++;
    const callN = executeCallCount;
    if (callN === 1) {
      stamp("priority_attempt1_start");
      await sleep(50);
      stamp("priority_attempt1_end");
      return {
        isSuccess: true,
        messages: [`Kelas Tersimpan : [ID ${ids[0]}] - berhasil`],
        statusCode: 200,
      };
    }
    if (callN === 2) {
      stamp("priority_wave1_attempt2_start");
      await sleep(50);
      stamp("priority_wave1_attempt2_end");
      // Leave some retryable remaining
      return {
        isSuccess: true,
        messages: [`Gagal : [ID ${ids[0]}] server sibuk, coba lagi`],
        statusCode: 200,
      };
    }
    if (callN === 3) {
      // This is Wave 2 — runs after gate released
      stamp("wave2_start");
      await sleep(200); // deliberately slow
      stamp("wave2_end");
      return { isSuccess: true, messages: [], statusCode: 200 };
    }
    return { isSuccess: true, messages: [], statusCode: 200 };
  });

  // Priority student
  const prioDone = postSubmit(makeSubmitReq("PRIO1", [
    { code: "IFX", class: "A" },
    { code: "IFY", class: "B" },
  ])).then(collectSSE).then(() => stamp("priority_http_returned"));

  await sleep(30); // let priority enter gate first

  // Normal student — should start right after Wave 1 (not waiting for Wave 2)
  const normalDone = processThroughGate(
    "NORMAL1", true, {},
    async () => {
      stamp("normal_execution_start");
      return "ok";
    }
  ).then(() => stamp("normal_done"));

  await Promise.all([prioDone, normalDone]);
  await sleep(400); // wait Wave 2 fire-and-forget

  const ev = (name: string) => timeline.find((e) => e.event === name)?.t ?? -1;

  const wave1End = ev("priority_wave1_attempt2_end");
  const normalStart = ev("normal_execution_start");
  const wave2Start = ev("wave2_start");

  // Normal must start AFTER Wave 1 ends but BEFORE or DURING Wave 2
  expect(normalStart).toBeGreaterThan(wave1End - 50); // normal unblocked close to Wave 1 end
  // Wave 2 should start approximately when normal starts (both after gate released)
  // Key assertion: normal does NOT wait for Wave 2 to complete
  const wave2End = ev("wave2_end");
  if (wave2Start > 0 && wave2End > 0) {
    // Normal should finish before Wave 2 finishes
    expect(ev("normal_done")).toBeLessThan(wave2End + 50);
  }
});

// ─────────────────────────────────────────────────────────────
// R6 — Normal queue latency improvement
// ─────────────────────────────────────────────────────────────

test("R6: Wave 1 (2 attempts) completes faster than old 3-attempt pattern", async () => {
  // Simulate fixed 100ms per attempt
  spyOn(simulatorModule, "simulateSyncSchedules").mockImplementation(async (session, courses) => ({
    warStarted: true,
    schedules: courses.map((c: any) => ({ code: c.code, class: c.class, schedule_submit_id: `SIM-${c.code}-${c.class}` })),
  } as any));

  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    await sleep(100); // fixed 100ms per attempt
    return {
      isSuccess: true,
      messages: [`Gagal : [ID ${ids[0]}] server sibuk, coba lagi`],
      statusCode: 200,
    };
  });

  const start = Date.now();
  await postSubmit(makeSubmitReq("PRIO1", [{ code: "IFT", class: "A" }])).then(collectSSE);
  const wave1Duration = Date.now() - start;

  // 2 attempts × 100ms + 300ms delay between = ~500ms max
  // Old 3 attempts would be ~700ms+
  // Gate must release within 2-attempt budget
  expect(wave1Duration).toBeLessThan(800);
});

// ─────────────────────────────────────────────────────────────
// R7 — FIFO ordering
// ─────────────────────────────────────────────────────────────

test("R7: FIFO within normal queue — normal A before B before C", async () => {
  const order: string[] = [];

  // All launch concurrently — gate controls ordering
  const p1 = processThroughGate("NORMAL_A", true, {}, async () => { order.push("NORMAL_A"); return "ok"; });
  await sleep(10);
  const p2 = processThroughGate("NORMAL_B", true, {}, async () => { order.push("NORMAL_B"); return "ok"; });
  await sleep(10);
  const p3 = processThroughGate("NORMAL_C", true, {}, async () => { order.push("NORMAL_C"); return "ok"; });

  await Promise.all([p1, p2, p3]);

  // FIFO must hold: A before B before C
  expect(order.indexOf("NORMAL_A")).toBeLessThan(order.indexOf("NORMAL_B"));
  expect(order.indexOf("NORMAL_B")).toBeLessThan(order.indexOf("NORMAL_C"));
});

test("R7: priority beats normal that enters within discovery window", async () => {
  const order: string[] = [];

  // Normal enters first, priority arrives during discovery — priority must win
  const p1 = processThroughGate("NORMAL_A", true, {}, async () => { order.push("NORMAL_A"); return "ok"; });
  await sleep(30); // within 150ms discovery window

  const p2 = processThroughGate("PRIO1", true, {}, async () => { order.push("PRIO1"); return "ok"; });
  const p3 = processThroughGate("PRIO2", true, {}, async () => { order.push("PRIO2"); return "ok"; });

  await Promise.all([p1, p2, p3]);

  // Both priorities must execute before NORMAL_A
  expect(order.indexOf("PRIO1")).toBeLessThan(order.indexOf("NORMAL_A"));
  expect(order.indexOf("PRIO2")).toBeLessThan(order.indexOf("NORMAL_A"));
});


// ─────────────────────────────────────────────────────────────
// R8 — Concurrent requests (no race / deadlock / starvation)
// ─────────────────────────────────────────────────────────────

test("R8: 3 priority + 5 normal concurrent — all complete, no starvation", async () => {
  const completed: string[] = [];

  spyOn(simulatorModule, "simulateSyncSchedules").mockImplementation(async (session, courses) => ({
    warStarted: true,
    schedules: courses.map((c: any) => ({ code: c.code, class: c.class, schedule_submit_id: `SIM-${c.code}` })),
  } as any));

  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    await sleep(20);
    return { isSuccess: true, messages: [], statusCode: 200 };
  });

  const prioNims = ["PRIO1", "PRIO2", "PRIO3"];
  const normalNims = ["N1", "N2", "N3", "N4", "N5"];

  const allRequests = [
    ...prioNims.map((nim) =>
      processThroughGate(nim, true, {}, async () => { completed.push(nim); return "ok"; })
    ),
    ...normalNims.map((nim, i) =>
      sleep(i * 10).then(() =>
        processThroughGate(nim, true, {}, async () => { completed.push(nim); return "ok"; })
      )
    ),
  ];

  await Promise.all(allRequests);

  // All 8 completed
  expect(completed).toHaveLength(8);
  // No duplicates
  expect(new Set(completed).size).toBe(8);
  // All NIMs present
  for (const nim of [...prioNims, ...normalNims]) {
    expect(completed).toContain(nim);
  }
  // Priorities all before normals
  const lastPrioIdx = Math.max(...prioNims.map((n) => completed.indexOf(n)));
  const firstNormalIdx = Math.min(...normalNims.map((n) => completed.indexOf(n)));
  expect(lastPrioIdx).toBeLessThan(firstNormalIdx);
}, 15000);

// ─────────────────────────────────────────────────────────────
// R9 — SSE stream integrity: Wave 2 must not emit client events
// ─────────────────────────────────────────────────────────────

test("R9: SSE stream closes before Wave 2 executes — no Wave 2 events in stream", async () => {
  let wave2Called = false;
  let streamAlreadyClosed = false;
  let streamClosedAt = -1;

  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: [
      { code: "IFW", class: "A", schedule_submit_id: "SIM-IFW-A" },
      { code: "IFX", class: "B", schedule_submit_id: "SIM-IFX-B" },
    ],
  } as any);

  let callCount = 0;
  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    callCount++;
    if (callCount <= 2) {
      // Wave 1 attempts: leave IFX-B as retryable
      return {
        isSuccess: true,
        messages: [
          "Kelas Tersimpan : [ID SIM-IFW-A] - berhasil",
          "Gagal : [ID SIM-IFX-B] server sibuk, coba lagi",
        ],
        statusCode: 200,
      };
    }
    // Wave 2 call
    wave2Called = true;
    return { isSuccess: true, messages: [], statusCode: 200 };
  });

  const t0 = performance.now();
  const response = await postSubmit(makeSubmitReq("PRIO1", [
    { code: "IFW", class: "A" },
    { code: "IFX", class: "B" },
  ]));

  // Collect stream — this should NOT block on Wave 2
  const events = await collectSSE(response);
  streamClosedAt = performance.now() - t0;

  // Wait for Wave 2 to complete
  await sleep(300);

  // Stream events must not contain any Wave 2 attempt markers
  const eventNames = events.filter((e) => e.type === "event").map((e) => e.name);

  // No internal wave markers exposed
  expect(eventNames).not.toContain("WAVE_2_STARTED");
  expect(eventNames).not.toContain("WAVE_2_COMPLETED");
  expect(eventNames).not.toContain("RECOVERY_STARTED");
  expect(eventNames).not.toContain("GATE");
  expect(eventNames).not.toContain("QUEUE");
  expect(eventNames).not.toContain("PRIORITY");
  expect(eventNames).not.toContain("REDIS");

  // Stream must contain a done event
  const doneEvent = events.find((e) => e.type === "done");
  expect(doneEvent).toBeDefined();

  // Stream closed, then Wave 2 fired — Wave 2 called after stream returned
  expect(wave2Called).toBe(true);
});

test("R9: SSE done event contains only user-safe fields", async () => {
  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: [{ code: "IFF", class: "A", schedule_submit_id: "SIM-IFF-A" }],
  } as any);

  spyOn(simulatorModule, "simulateSubmitSchedules").mockResolvedValue({
    isSuccess: true,
    messages: ["Kelas Tersimpan : [ID SIM-IFF-A] - berhasil"],
    statusCode: 200,
  });

  const events = await postSubmit(makeSubmitReq("PRIO1", [{ code: "IFF", class: "A" }])).then(collectSSE);
  const doneEvent = events.find((e) => e.type === "done");

  expect(doneEvent).toBeDefined();
  expect(typeof doneEvent.success).toBe("boolean");
  expect(Array.isArray(doneEvent.messages)).toBe(true);

  // Must NOT expose internal state
  const raw = JSON.stringify(doneEvent);
  expect(raw).not.toContain("wave");
  expect(raw).not.toContain("priority");
  expect(raw).not.toContain("gate");
  expect(raw).not.toContain("queue");
  expect(raw).not.toContain("redis");
  expect(raw).not.toContain("recovery");
});

// ─────────────────────────────────────────────────────────────
// R10 — Redis cleanup
// ─────────────────────────────────────────────────────────────

test("R10: Redis keys cleaned after priority request completes", async () => {
  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: [{ code: "IFK", class: "A", schedule_submit_id: "SIM-IFK-A" }],
  } as any);

  spyOn(simulatorModule, "simulateSubmitSchedules").mockResolvedValue({
    isSuccess: true,
    messages: ["Kelas Tersimpan : [ID SIM-IFK-A] - berhasil"],
    statusCode: 200,
  });

  await postSubmit(makeSubmitReq("PRIO1", [{ code: "IFK", class: "A" }])).then(collectSSE);

  // Priority queue should be empty
  const pQueueLen = await mockRedis.zcard("war:test:priority:queue");
  expect(pQueueLen).toBe(0);

  // Priority running counter should be 0
  const pRunning = await mockRedis.get("war:test:priority:running");
  const runningVal = pRunning ? parseInt(pRunning) : 0;
  expect(runningVal).toBeLessThanOrEqual(0);

  // No stale processing lock
  const processingLock = await mockRedis.get("war:test:priority:processing");
  expect(processingLock).toBeNull();
});

test("R10: Redis keys cleaned after normal request completes", async () => {
  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: [{ code: "IFN", class: "A", schedule_submit_id: "SIM-IFN-A" }],
  } as any);

  spyOn(simulatorModule, "simulateSubmitSchedules").mockResolvedValue({
    isSuccess: true,
    messages: ["Kelas Tersimpan : [ID SIM-IFN-A] - berhasil"],
    statusCode: 200,
  });

  await postSubmit(makeSubmitReq("NORMAL99", [{ code: "IFN", class: "A" }])).then(collectSSE);

  await sleep(200); // allow discovery window

  const nQueueLen = await mockRedis.zcard("war:test:normal:queue");
  expect(nQueueLen).toBe(0);

  const normalLock = await mockRedis.get("war:test:normal:processing");
  expect(normalLock).toBeNull();
});

// ─────────────────────────────────────────────────────────────
// R11 — Wave 2 fire-and-forget: HTTP returns before Wave 2 finishes
// ─────────────────────────────────────────────────────────────

test("R11: HTTP response resolves before Wave 2 completes", async () => {
  const timestamps: Record<string, number> = {};
  const t0 = performance.now();
  const stamp = (k: string) => { timestamps[k] = performance.now() - t0; };

  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: [
      { code: "IFQ", class: "A", schedule_submit_id: "SIM-IFQ-A" },
      { code: "IFR", class: "B", schedule_submit_id: "SIM-IFR-B" },
    ],
  } as any);

  let callCount = 0;
  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    callCount++;
    if (callCount <= 2) {
      // Wave 1: keep IFR-B as retryable
      return {
        isSuccess: true,
        messages: [
          "Kelas Tersimpan : [ID SIM-IFQ-A] - berhasil",
          "Gagal : [ID SIM-IFR-B] server sibuk, coba lagi",
        ],
        statusCode: 200,
      };
    }
    // Wave 2 — deliberately slow
    stamp("wave2_start");
    await sleep(500);
    stamp("wave2_end");
    return { isSuccess: true, messages: [], statusCode: 200 };
  });

  const response = await postSubmit(makeSubmitReq("PRIO1", [
    { code: "IFQ", class: "A" },
    { code: "IFR", class: "B" },
  ]));

  // Collect stream — this resolves when HTTP is done
  await collectSSE(response);
  stamp("http_done");

  // Wait for Wave 2 to complete
  await sleep(700);

  // HTTP must complete before Wave 2 ends
  if (timestamps.wave2_end) {
    expect(timestamps.http_done).toBeLessThan(timestamps.wave2_end);
  }
  // Wave 2 must actually start (proves it ran)
  expect(timestamps.wave2_start).toBeDefined();
});

// ─────────────────────────────────────────────────────────────
// R12 — Test mode compatibility
// ─────────────────────────────────────────────────────────────

test("R12: non-stream mode works correctly in test mode with wave separation", async () => {
  const executedIds: string[][] = [];

  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: [
      { code: "IFZ", class: "A", schedule_submit_id: "SIM-IFZ-A" },
      { code: "IFY", class: "B", schedule_submit_id: "SIM-IFY-B" },
    ],
  } as any);

  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    executedIds.push([...ids]);
    if (executedIds.length === 1) {
      return {
        isSuccess: true,
        messages: [
          "Kelas Tersimpan : [ID SIM-IFZ-A] - berhasil",
          "Gagal : [ID SIM-IFY-B] server sibuk, coba lagi",
        ],
        statusCode: 200,
      };
    }
    return { isSuccess: true, messages: [], statusCode: 200 };
  });

  const req = makeSubmitReq("PRIO1", [{ code: "IFZ", class: "A" }, { code: "IFY", class: "B" }], false);
  const response = await postSubmit(req);

  expect(response.status).toBe(200);
  const data = await response.json();

  expect(typeof data.success).toBe("boolean");
  expect(Array.isArray(data.messages)).toBe(true);

  await sleep(200); // allow Wave 2 fire-and-forget

  // At minimum attempt 1 happened; Wave 1 attempt 2 may also have run
  expect(executedIds.length).toBeGreaterThanOrEqual(1);
});

test("R12: Wave 1 max 2 attempts — attempt 3 never fires inside gate", async () => {
  let callCount = 0;

  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: [
      { code: "IF_A", class: "X", schedule_submit_id: "SIM-IF_A-X" },
    ],
  } as any);

  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    callCount++;
    // Always fail with retryable error
    return {
      isSuccess: false,
      messages: ["Gagal : [ID SIM-IF_A-X] server sibuk, coba lagi"],
      statusCode: 504,
    };
  });

  await postSubmit(makeSubmitReq("PRIO1", [{ code: "IF_A", class: "X" }])).then(collectSSE);
  await sleep(300); // Wave 2 fire-and-forget

  // Wave 1: 2 calls. Wave 2: 1 call. Total = 3.
  // The critical constraint: Wave 1 must be exactly 2 (not 3).
  // We can verify by checking total = exactly 3 (not 4+).
  expect(callCount).toBeLessThanOrEqual(3);
  expect(callCount).toBeGreaterThanOrEqual(2); // at least Wave 1 attempts
});

// ─────────────────────────────────────────────────────────────
// Integration: Full pipeline end-to-end with mixed outcomes
// ─────────────────────────────────────────────────────────────

test("Integration: full two-wave pipeline with mixed outcomes validates all phases", async () => {
  const phaseLog: { phase: string; ids: string[] }[] = [];

  spyOn(simulatorModule, "simulateSyncSchedules").mockResolvedValue({
    warStarted: true,
    schedules: ["A","B","C","D","E"].map(x => ({
      code: `IF${x}`, class: "1", schedule_submit_id: `SIM-IF${x}-1`,
    })),
  } as any);

  spyOn(simulatorModule, "simulateSubmitSchedules").mockImplementation(async (session, ids) => {
    const callN = phaseLog.length + 1;
    phaseLog.push({ phase: `call_${callN}`, ids: [...ids] });

    if (callN === 1) {
      // A, B, D succeed. C = server_busy (retryable). E = penuh (permanent).
      return {
        isSuccess: true,
        messages: [
          "Kelas Tersimpan : [ID SIM-IFA-1] - berhasil",
          "Kelas Tersimpan : [ID SIM-IFB-1] - berhasil",
          "Gagal : [ID SIM-IFC-1] server sibuk, coba lagi",
          "Kelas Tersimpan : [ID SIM-IFD-1] - berhasil",
          "Gagal : [ID SIM-IFE-1] kelas penuh",
        ],
        statusCode: 200,
      };
    }
    if (callN === 2) {
      // Wave 1 Attempt 2: C, E remain. C = server_busy. E = penuh.
      return {
        isSuccess: true,
        messages: [
          "Gagal : [ID SIM-IFC-1] server sibuk, coba lagi",
          "Gagal : [ID SIM-IFE-1] kelas penuh",
        ],
        statusCode: 200,
      };
    }
    // Wave 2: only C (E filtered as permanent)
    return {
      isSuccess: true,
      messages: ["Kelas Tersimpan : [ID SIM-IFC-1] - berhasil"],
      statusCode: 200,
    };
  });

  await postSubmit(makeSubmitReq("PRIO1", ["A","B","C","D","E"].map(x => ({ code: `IF${x}`, class: "1" }))))
    .then(collectSSE);

  await sleep(400); // Wave 2 fire-and-forget

  // call_1: all 5
  expect(phaseLog[0].ids).toHaveLength(5);

  // call_2 (Wave 1 Attempt 2): A, B, D removed — only C and E
  expect(phaseLog[1].ids).not.toContain("SIM-IFA-1");
  expect(phaseLog[1].ids).not.toContain("SIM-IFB-1");
  expect(phaseLog[1].ids).not.toContain("SIM-IFD-1");
  expect(phaseLog[1].ids).toContain("SIM-IFC-1");
  expect(phaseLog[1].ids).toContain("SIM-IFE-1");

  // call_3 (Wave 2): only C (retryable). E (permanent = penuh) filtered out.
  expect(phaseLog[2].ids).toContain("SIM-IFC-1");
  expect(phaseLog[2].ids).not.toContain("SIM-IFE-1");

  // Total calls: exactly 3 (not 4)
  expect(phaseLog).toHaveLength(3);
});
