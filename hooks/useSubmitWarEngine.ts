"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import axios, { isAxiosError } from "axios";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { SubmitLog, AttemptStatus, PreparationStatus } from "@/types/submit_log";
import { logger } from "@/lib/logger";
import { getLocalStorage, setLocalStorage } from "@/helper/local_storage";
import {
  SAVED_SCHEDULE_KEY,
  OFFERING_COURSE_KEY,
  backfillCourseSemesters,
} from "@/helper/frontend_helper";
import { WAR_IN_PROGRESS_KEY } from "@/providers/LocalStorageProvider";
import { gooeyToast } from "@/components/ui/goey-toaster";
import {
  ActiveUser,
  trackWarStarted,
  trackAttemptStarted,
  trackAttemptFinished,
  trackCourseSecured,
  trackCourseFailed,
  trackWarCompleted,
} from "@/lib/analytics/events";

export const TOTAL_ATTEMPTS = 3;
export const DELAY_MS = 300;

/** Logs frontend UI state changes in structured format matching war-ui specification. */
function logWarUi(phase: number, status: string, durationMs?: number) {
  const lines = [`[war-ui]`, `Phase ${phase}`, `status=${status}`];
  if (durationMs !== undefined) {
    lines.push(`duration=${durationMs}ms`);
  }
  logger.info(lines.join("\n"));
}

/** Classifies a server message as success/error by Indonesian keyword. */
const handleAlertType = (message: string): "success" | "error" | undefined => {
  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes("bukan periode") ||
    lowerMsg.includes("gagal") ||
    lowerMsg.includes("bentrok") ||
    lowerMsg.includes("penuh")
  ) {
    return "error";
  } else if (
    lowerMsg.includes("berhasil") ||
    lowerMsg.includes("sukses") ||
    lowerMsg.includes("terdaftar") ||
    lowerMsg.includes("tersimpan") ||
    lowerMsg.includes("simpan")
  ) {
    return "success";
  }
};

function extractCourseFromMessage(msg: string): {
  isSuccess: boolean;
  code?: string;
  klass?: string;
  scheduleId?: string;
} | null {
  const alertType = handleAlertType(msg);
  if (!alertType) return null;
  const isSuccess = alertType === "success";

  const idMatch = msg.match(/\[ID\s+([^\]]+)\]/i);
  if (idMatch) {
    const rawId = idMatch[1].trim();
    if (rawId.startsWith("SIM-")) {
      const parts = rawId.slice(4).split("-");
      if (parts.length >= 2) {
        const klass = parts.pop()!;
        const code = parts.join("-");
        return { isSuccess, code, klass, scheduleId: rawId };
      }
    }
    const underscoreParts = rawId.split("_");
    if (underscoreParts.length === 2) {
      return { isSuccess, code: underscoreParts[0], klass: underscoreParts[1], scheduleId: rawId };
    }
    return { isSuccess, scheduleId: rawId };
  }

  const codeClassMatch = msg.match(/(?:Tersimpan|Gagal)\s*:\s*([A-Z0-9_-]+)\s+([A-Z0-9]+)/i);
  if (codeClassMatch) {
    return { isSuccess, code: codeClassMatch[1], klass: codeClassMatch[2] };
  }

  const codeDashClassMatch = msg.match(/(?:Tersimpan|Gagal)\s*:\s*([A-Z0-9]+)\s*-\s*([A-Z0-9]+)/i);
  if (codeDashClassMatch) {
    return { isSuccess, code: codeDashClassMatch[1], klass: codeDashClassMatch[2] };
  }

  return null;
}

function matchesCourse(
  c: CourseSchedule,
  code?: string,
  klass?: string,
  scheduleId?: string,
): boolean {
  if (code && klass) {
    if (c.code.toUpperCase() === code.toUpperCase() && c.class.toUpperCase() === klass.toUpperCase()) {
      return true;
    }
  }
  if (scheduleId) {
    if (c.schedule_id === scheduleId || c.schedule_submit_id === scheduleId) return true;
    const simId = `SIM-${c.code}-${c.class}`.toUpperCase();
    if (simId === scheduleId.toUpperCase()) return true;
    const underscoreId = `${c.code}_${c.class}`.toUpperCase();
    if (underscoreId === scheduleId.toUpperCase()) return true;
  }
  return false;
}

type WarState = {
  courses: CourseSchedule[];
  isHydrated: boolean;
  isWarStarted: boolean;
  isFindingSchedule: boolean;
  isSubmitting: boolean;
  inFlight: Set<string>;
  remaining: Set<string>;
  attempt: number;
  startedAt: number | null;
  prepStatus: PreparationStatus;
  prepMessage: string;
  executionGranted: boolean;
  logs: SubmitLog[];
  currentActivePhase: number;
};

const initialState: WarState = {
  courses: [],
  isHydrated: false,
  isWarStarted: false,
  isFindingSchedule: false,
  isSubmitting: false,
  inFlight: new Set(),
  remaining: new Set(),
  attempt: 0,
  startedAt: null,
  prepStatus: "idle",
  prepMessage: "",
  executionGranted: false,
  logs: [],
  currentActivePhase: 1,
};

type WarAction =
  | { type: "HYDRATE"; courses: CourseSchedule[] }
  | { type: "SYNC_STARTED" }
  | { type: "SYNC_COMPLETED"; courses: CourseSchedule[] }
  | { type: "SYNC_FAILED" }
  | { type: "START_WAR"; scheduleIds: string[]; startedAt: number }
  | { type: "PREP_UPDATE"; status: PreparationStatus; message: string }
  | { type: "EXECUTION_GRANTED"; message: string }
  | { type: "ATTEMPT_STARTED"; attempt: number }
  | { type: "ATTEMPT_FINISHED"; attempt: number; patch: Partial<SubmitLog> }
  | { type: "COURSE_SUBMIT_STARTED"; scheduleIds: string[] }
  | { type: "COURSE_SUBMIT_SUCCESS"; code?: string; klass?: string; scheduleId?: string }
  | { type: "COURSE_SUBMIT_FAILED"; code?: string; klass?: string; scheduleId?: string }
  | { type: "ATTEMPT_SETTLED"; scheduleIds: string[] }
  | { type: "COURSE_RELEASED"; courses: CourseSchedule[] }
  | { type: "FINISH_WAR" };

function warReducer(state: WarState, action: WarAction): WarState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, courses: action.courses, isHydrated: true };

    case "SYNC_STARTED":
      return { ...state, isFindingSchedule: true };

    case "SYNC_COMPLETED":
      return {
        ...state,
        courses: action.courses,
        isWarStarted: true,
        isFindingSchedule: false,
      };

    case "SYNC_FAILED":
      return { ...state, isWarStarted: false, isFindingSchedule: false };

    case "START_WAR": {
      const initialLogs: SubmitLog[] = Array.from(
        { length: TOTAL_ATTEMPTS },
        (_, i) => {
          const phase = i + 1;
          return {
            phase,
            attempt: phase,
            status: "waiting",
            messages: [],
            timestamp: new Date(action.startedAt).toISOString(),
          };
        },
      );
      return {
        ...state,
        isSubmitting: true,
        remaining: new Set(action.scheduleIds),
        inFlight: new Set(),
        startedAt: action.startedAt,
        attempt: 0,
        prepStatus: "preparing",
        prepMessage: "Persiapan submit...",
        executionGranted: false,
        logs: initialLogs,
        currentActivePhase: 1,
      };
    }

    case "PREP_UPDATE":
      return {
        ...state,
        prepStatus: action.status,
        prepMessage: action.message,
      };

    case "EXECUTION_GRANTED":
      return {
        ...state,
        prepStatus: "completed",
        prepMessage: action.message,
        executionGranted: true,
      };

    case "ATTEMPT_STARTED": {
      const { attempt } = action;
      let logs = [...state.logs];
      const logIndex = attempt - 1;
      if (logs[logIndex]) {
        logs[logIndex] = { ...logs[logIndex], status: "processing" };
        logWarUi(attempt, "processing");
      }
      return {
        ...state,
        attempt,
        currentActivePhase: attempt,
        logs,
      };
    }

    case "ATTEMPT_FINISHED": {
      const { attempt, patch } = action;
      let logs = [...state.logs];
      const logIndex = attempt - 1;
      if (logs[logIndex]) {
        const finalStatus = patch.status || "completed";
        logs[logIndex] = { ...logs[logIndex], ...patch, status: finalStatus };
        logWarUi(attempt, finalStatus, patch.durationMs);
      }
      return {
        ...state,
        logs,
        attempt: Math.max(state.attempt, attempt),
      };
    }

    case "COURSE_SUBMIT_STARTED": {
      const inFlight = new Set(state.inFlight);
      action.scheduleIds.forEach((id) => inFlight.add(id));
      return { ...state, inFlight };
    }

    case "COURSE_SUBMIT_SUCCESS": {
      const match = state.courses.find((c) =>
        matchesCourse(c, action.code, action.klass, action.scheduleId),
      );
      const courses = state.courses.map((c) =>
        matchesCourse(c, action.code, action.klass, action.scheduleId)
          ? { ...c, saved_in_submit: true, schedule_submit_id: "" }
          : c,
      );
      const inFlight = new Set(state.inFlight);
      const remaining = new Set(state.remaining);
      if (match) {
        inFlight.delete(match.schedule_id);
        remaining.delete(match.schedule_id);
      }
      return { ...state, courses, inFlight, remaining };
    }

    case "COURSE_SUBMIT_FAILED": {
      const match = state.courses.find((c) =>
        matchesCourse(c, action.code, action.klass, action.scheduleId),
      );
      const inFlight = new Set(state.inFlight);
      if (match) inFlight.delete(match.schedule_id);
      return { ...state, inFlight };
    }

    case "ATTEMPT_SETTLED": {
      const inFlight = new Set(state.inFlight);
      action.scheduleIds.forEach((id) => inFlight.delete(id));
      return { ...state, inFlight };
    }

    case "COURSE_RELEASED":
      return { ...state, courses: action.courses };

    case "FINISH_WAR":
      return { ...state, isSubmitting: false };

    default:
      return state;
  }
}

/**
 * War-only state machine for /submit. `courses` is the single React-state
 * source of truth — localStorage is written to as a side effect of state
 * changes, never read back into the UI directly (except on first mount).
 */
export function useSubmitWarEngine() {
  const [state, dispatch] = useReducer(warReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // --- Sync target courses against the KRS entry form ("is the war open?"
  // check, and the one final post-war sync). Returns the resulting courses
  // directly so callers don't have to race stateRef against React's commit.
  const syncWithServer = useCallback(
    async (
      coursesOverride?: CourseSchedule[],
    ): Promise<{ success: boolean; courses: CourseSchedule[] }> => {
      const courses = coursesOverride ?? stateRef.current.courses;
      if (courses.length === 0) return { success: true, courses };

      dispatch({ type: "SYNC_STARTED" });
      try {
        const params = courses.map((course) => ({
          code: course.code,
          class: course.class,
        }));

        const response = await axios.get("/api/submit", {
          params: { courses: JSON.stringify(params) },
        });

        if (!response.data.success) {
          dispatch({ type: "SYNC_FAILED" });
          gooeyToast.error("Terjadi kesalahan", {
            description: response.data.message,
          });
          return { success: false, courses };
        }

        const data = response.data.data as
          | { code: string; class: string; schedule_submit_id: string }[]
          | undefined;
        const updated = courses.map((course) => {
          if (course.saved_in_submit) {
            return { ...course, schedule_submit_id: "", saved_in_submit: true };
          }
          const matched = Array.isArray(data)
            ? data.find(
                (item) =>
                  item.code === course.code && item.class === course.class,
              )
            : null;

          if (matched && matched.schedule_submit_id) {
            return {
              ...course,
              schedule_submit_id: matched.schedule_submit_id,
              saved_in_submit: false,
            };
          }
          return { ...course, schedule_submit_id: "", saved_in_submit: true };
        });

        dispatch({ type: "SYNC_COMPLETED", courses: updated });
        return { success: true, courses: updated };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (typeof window !== "undefined") window.location.href = "/login";
        }
        dispatch({ type: "SYNC_FAILED" });
        return { success: false, courses };
      }
    },
    [],
  );

  const startWar = useCallback(async () => {
    const current = stateRef.current;
    if (!current.isWarStarted) {
      gooeyToast.warning("Info Bosku", {
        description: "Waktu perang KRS belum dimulai",
      });
      return;
    }
    if (current.courses.length === 0) {
      gooeyToast.error("Jadwalmu kosong", {
        description: "Pilih jadwal dulu sebelum mulai Perang!",
      });
      return;
    }

    const targets = current.courses.filter(
      (c) => c.saved_in_submit === false && c.schedule_submit_id !== "",
    );
    if (targets.length === 0) {
      gooeyToast.success("Info Bosku", {
        description: "Tidak ada jadwal lagi yang perlu di ikutkan perang",
      });
      return;
    }

    const activeUser = getLocalStorage("active_user") as ActiveUser | null;
    if (activeUser) trackWarStarted(activeUser, current.courses.length);

    dispatch({
      type: "START_WAR",
      scheduleIds: targets.map((c) => c.schedule_id),
      startedAt: Date.now(),
    });

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          courses: targets.map((c) => ({ code: c.code, class: c.class })),
          nim: activeUser?.nim || "",
        }),
      });

      if (!response.ok || !response.body) {
        if (response.status === 401 && typeof window !== "undefined") {
          window.location.href = "/login";
          return;
        }
        gooeyToast.error("Terjadi Kesalahan", {
          description: "Gagal memulai perang KRS.",
        });
        dispatch({ type: "FINISH_WAR" });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let attemptStartTimes: Record<number, number> = {};

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let data: any;
          try {
            data = JSON.parse(line);
          } catch (e) {
            continue;
          }

          if (data.type === "event") {
            const { name, attempt, result } = data;

            if (name === "ATTEMPT_STARTED" && attempt) {
              attemptStartTimes[attempt] = Date.now();
              dispatch({ type: "ATTEMPT_STARTED", attempt });
              if (activeUser) trackAttemptStarted(activeUser, attempt);
            } else if (name === "ATTEMPT_FINISHED" && attempt && result) {
              const startTime = attemptStartTimes[attempt] || Date.now();
              const durationMs = Date.now() - startTime;
              const rawMessages: string[] = Array.isArray(result.messages) ? result.messages : [];

              let successCount = 0;
              let failureCount = 0;
              const affectedCourses: {
                code: string;
                class: string;
                result: "success" | "error";
              }[] = [];

              const logMessages = rawMessages.map((msg) => {
                const type = handleAlertType(msg) || "error";
                if (type === "success") successCount++;
                else failureCount++;
                return { status: type, message: msg };
              });

              rawMessages.forEach((msg) => {
                const parsed = extractCourseFromMessage(msg);
                if (parsed) {
                  const { isSuccess, code, klass, scheduleId } = parsed;
                  if (isSuccess) {
                    dispatch({ type: "COURSE_SUBMIT_SUCCESS", code, klass, scheduleId });
                    affectedCourses.push({
                      code: code || scheduleId || "",
                      class: klass || "",
                      result: "success",
                    });
                    if (activeUser) trackCourseSecured(activeUser, attempt);
                  } else {
                    dispatch({ type: "COURSE_SUBMIT_FAILED", code, klass, scheduleId });
                    affectedCourses.push({
                      code: code || scheduleId || "",
                      class: klass || "",
                      result: "error",
                    });
                    if (activeUser) trackCourseFailed(activeUser, attempt);
                  }
                }
              });

              dispatch({
                type: "ATTEMPT_FINISHED",
                attempt,
                patch: {
                  status: result.isSuccess !== false ? "completed" : "failed",
                  messages: logMessages,
                  statusCode: result.status_code || 200,
                  successCount,
                  failureCount,
                  affectedCourses,
                  durationMs,
                  finishedAt: new Date().toISOString(),
                },
              });

              if (activeUser) {
                trackAttemptFinished(activeUser, {
                  attempt,
                  durationMs,
                  successCount,
                  failedCount: failureCount,
                });
              }
            }
          } else if (data.type === "error") {
            gooeyToast.error("Terjadi Kesalahan", {
              description: data.message || "Gagal submit.",
            });
          }
        }
      }
    } catch (error) {
      gooeyToast.error("Terjadi Kesalahan", {
        description: "Koneksi terputus saat submit.",
      });
    }

    const finalSync = await syncWithServer(stateRef.current.courses);
    dispatch({ type: "FINISH_WAR" });

    const preparedCount = finalSync.courses.length;
    const successCount = finalSync.courses.filter((c) => c.saved_in_submit === true).length;

    gooeyToast.success("Info Bosku", {
      description: "Perang berhasil diselesaikan",
    });
    if (activeUser) {
      trackWarCompleted(activeUser, { preparedCount, successCount });
    }
  }, [syncWithServer]);

  const releaseCourses = useCallback(
    async (
      readyReleases: { course_code: string; course_class: string }[],
    ): Promise<boolean> => {
      const courses = stateRef.current.courses;
      const releasableCourses = readyReleases.filter((item) =>
        courses.some(
          (c) =>
            c.code === item.course_code &&
            c.class === item.course_class &&
            c.saved_in_submit === true,
        ),
      );
      const removableCourses = readyReleases.filter((item) =>
        courses.some(
          (c) =>
            c.code === item.course_code &&
            c.class === item.course_class &&
            c.saved_in_submit === false,
        ),
      );

      let nextCourses = courses;
      let anyChange = false;

      if (releasableCourses.length > 0) {
        try {
          const response = await axios.delete("/api/submit", {
            data: { courses: JSON.stringify(releasableCourses) },
          });
          if (response.data.success) {
            nextCourses = nextCourses.map((course) => {
              const shouldUpdate = releasableCourses.some(
                (item) =>
                  item.course_code === course.code &&
                  item.course_class === course.class,
              );
              return shouldUpdate
                ? { ...course, saved_in_submit: false, schedule_submit_id: "" }
                : course;
            });
            anyChange = true;
            gooeyToast.success("Info Bosku", {
              description: "Jadwal terpilih telah dilepaskan",
            });
          } else {
            gooeyToast.error("Terjadi Kesalahan", {
              description: "Gagal melepas jadwal yang dipilih",
            });
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            if (typeof window !== "undefined") window.location.href = "/login";
          }
          gooeyToast.error("Terjadi Kesalahan", {
            description: "Gagal melepas jadwal yang dipilih",
          });
        }
      }

      if (removableCourses.length > 0) {
        nextCourses = nextCourses.filter(
          (course) =>
            !removableCourses.some(
              (item) =>
                item.course_code === course.code &&
                item.course_class === course.class,
            ),
        );
        anyChange = true;
        gooeyToast.success("Info Bosku", {
          description: "Jadwal terpilih telah dihapus",
        });
      }

      if (anyChange) {
        dispatch({ type: "COURSE_RELEASED", courses: nextCourses });
        await syncWithServer(nextCourses);
      }
      return anyChange;
    },
    [syncWithServer],
  );

  // Hydrate from localStorage once, then run the initial "is the war open" sync
  useEffect(() => {
    const saved = getLocalStorage(SAVED_SCHEDULE_KEY);
    if (saved && Array.isArray(saved)) {
      const offeringCourse = getLocalStorage(OFFERING_COURSE_KEY) as
        | OfferingCourse[]
        | null;
      const patched = backfillCourseSemesters(saved, offeringCourse);
      if (patched !== saved) setLocalStorage(SAVED_SCHEDULE_KEY, patched);
      dispatch({ type: "HYDRATE", courses: patched });
      void syncWithServer(patched);
    } else {
      dispatch({ type: "HYDRATE", courses: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React state is the source of truth; localStorage is persistence only.
  useEffect(() => {
    if (!state.isHydrated) return;
    setLocalStorage(SAVED_SCHEDULE_KEY, state.courses);
  }, [state.courses, state.isHydrated]);

  // Broadcast war-in-progress so /schedule and /adopt-schedule can lock
  useEffect(() => {
    setLocalStorage(WAR_IN_PROGRESS_KEY, state.isSubmitting);
  }, [state.isSubmitting]);

  const securedCount = state.courses.filter((c) => c.saved_in_submit).length;
  const totalCount = state.courses.length;

  return {
    courses: state.courses,
    isHydrated: state.isHydrated,
    isWarStarted: state.isWarStarted,
    isFindingSchedule: state.isFindingSchedule,
    isSubmitting: state.isSubmitting,
    inFlight: state.inFlight,
    remaining: state.remaining,
    attempt: state.attempt,
    startedAt: state.startedAt,
    prepStatus: state.prepStatus,
    prepMessage: state.prepMessage,
    executionGranted: state.executionGranted,
    logs: state.logs,
    securedCount,
    totalCount,
    checkWarStatus: syncWithServer,
    startWar,
    releaseCourses,
  };
}


