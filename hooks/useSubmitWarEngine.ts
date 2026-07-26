"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import axios, { isAxiosError } from "axios";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { SubmitLog } from "@/types/submit_log";
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const SUCCESS_COURSE_PATTERN = /Tersimpan\s*:\s*([A-Z0-9]+)\s+([A-Z0-9]+)\s*-/i;
const FAILURE_COURSE_PATTERN = /Gagal\s*:\s*([A-Z0-9]+)\s+([A-Za-z0-9]+)/i;

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
  logs: SubmitLog[];
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
  logs: [],
};

type WarAction =
  | { type: "HYDRATE"; courses: CourseSchedule[] }
  | { type: "SYNC_STARTED" }
  | { type: "SYNC_COMPLETED"; courses: CourseSchedule[] }
  | { type: "SYNC_FAILED" }
  | { type: "START_WAR"; scheduleIds: string[]; startedAt: number }
  | { type: "START_ATTEMPT"; attempt: number; timestamp: string }
  | { type: "COURSE_SUBMIT_STARTED"; scheduleIds: string[] }
  | { type: "COURSE_SUBMIT_SUCCESS"; code: string; klass: string }
  | { type: "COURSE_SUBMIT_FAILED"; code: string; klass: string }
  | { type: "ATTEMPT_SETTLED"; scheduleIds: string[] }
  | { type: "ATTEMPT_FINISHED"; attempt: number; patch: Partial<SubmitLog> }
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

    case "START_WAR":
      return {
        ...state,
        isSubmitting: true,
        remaining: new Set(action.scheduleIds),
        inFlight: new Set(),
        startedAt: action.startedAt,
      };

    case "START_ATTEMPT": {
      const newLog: SubmitLog = {
        attempt: action.attempt,
        status: "pending",
        messages: [],
        timestamp: action.timestamp,
        startedAt: action.timestamp,
      };
      return { ...state, attempt: action.attempt, logs: [newLog, ...state.logs] };
    }

    case "COURSE_SUBMIT_STARTED": {
      const inFlight = new Set(state.inFlight);
      action.scheduleIds.forEach((id) => inFlight.add(id));
      return { ...state, inFlight };
    }

    case "COURSE_SUBMIT_SUCCESS": {
      const match = state.courses.find(
        (c) => c.code === action.code && c.class === action.klass,
      );
      const courses = state.courses.map((c) =>
        c.code === action.code && c.class === action.klass
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
      const match = state.courses.find(
        (c) => c.code === action.code && c.class === action.klass,
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

    case "ATTEMPT_FINISHED": {
      const logs = state.logs.map((log) =>
        log.attempt === action.attempt ? { ...log, ...action.patch } : log,
      );
      return { ...state, logs };
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
      } catch {
        dispatch({ type: "SYNC_FAILED" });
        return { success: false, courses };
      }
    },
    [],
  );

  // --- One submit attempt: computes its own remaining/not-in-flight list at
  // fire time (never the stale list captured when the war started), marks
  // those schedule_ids in-flight before the request goes out, and updates
  // course state the instant a success message is parsed — not batched.
  const processAttempt = useCallback(async (attemptNumber: number) => {
    const startedAt = new Date();
    dispatch({
      type: "START_ATTEMPT",
      attempt: attemptNumber,
      timestamp: startedAt.toISOString(),
    });

    const activeUser = getLocalStorage("active_user") as ActiveUser | null;
    if (activeUser) trackAttemptStarted(activeUser, attemptNumber);

    const finishLog = (patch: Partial<SubmitLog>) => {
      const finishedAt = new Date();
      dispatch({
        type: "ATTEMPT_FINISHED",
        attempt: attemptNumber,
        patch: {
          ...patch,
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        },
      });
    };

    const submitTargets = stateRef.current.courses.filter(
      (c) =>
        c.saved_in_submit === false &&
        c.schedule_submit_id !== "" &&
        stateRef.current.remaining.has(c.schedule_id) &&
        !stateRef.current.inFlight.has(c.schedule_id),
    );

    if (submitTargets.length === 0) {
      finishLog({
        status: "success",
        messages: [
          {
            status: "success",
            message: "Kamu menang dalam perang KRS. Semua jadwalmu telah aman",
          },
        ],
        statusCode: 200,
        successCount: 0,
        failureCount: 0,
        affectedCourses: [],
      });
      return;
    }

    const scheduleIds = submitTargets.map((c) => c.schedule_id);
    dispatch({ type: "COURSE_SUBMIT_STARTED", scheduleIds });

    try {
      const response = await axios.post("/api/submit", {
        schedule_ids: submitTargets.map((c) => c.schedule_submit_id as string),
      });

      const data = response.data;
      const rawMessages: string[] = Array.isArray(data.messages)
        ? data.messages
        : [];

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
        const successMatch = msg.match(SUCCESS_COURSE_PATTERN);
        if (successMatch) {
          const [, code, klass] = successMatch;
          dispatch({ type: "COURSE_SUBMIT_SUCCESS", code, klass });
          affectedCourses.push({ code, class: klass, result: "success" });
          if (activeUser) trackCourseSecured(activeUser, attemptNumber);
          return;
        }
        const failureMatch = msg.match(FAILURE_COURSE_PATTERN);
        if (failureMatch) {
          const [, code, klass] = failureMatch;
          dispatch({ type: "COURSE_SUBMIT_FAILED", code, klass });
          affectedCourses.push({ code, class: klass, result: "error" });
          if (activeUser) trackCourseFailed(activeUser, attemptNumber);
        }
      });

      // Safety net: any schedule_id sent this attempt that didn't match a
      // parsed message (e.g. a simulated/real network timeout) must still be
      // freed from in-flight so the next attempt can retry it.
      dispatch({ type: "ATTEMPT_SETTLED", scheduleIds });

      finishLog({
        status: "success",
        messages: logMessages,
        statusCode: data.status_code,
        successCount,
        failureCount,
        affectedCourses,
      });

      if (activeUser) {
        trackAttemptFinished(activeUser, {
          attempt: attemptNumber,
          durationMs: Date.now() - startedAt.getTime(),
          successCount,
          failedCount: failureCount,
        });
      }
    } catch (error) {
      dispatch({ type: "ATTEMPT_SETTLED", scheduleIds });
      const axiosError = isAxiosError(error) ? error : null;
      const errorMsg =
        axiosError?.response?.data?.message ||
        axiosError?.message ||
        (error instanceof Error ? error.message : "Error tidak dikenal");
      finishLog({
        status: "success",
        messages: [{ status: "error", message: errorMsg }],
        statusCode: axiosError?.response?.status,
        successCount: 0,
        failureCount: 1,
        affectedCourses: [],
      });
    }
  }, []);

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

    let nextAttempt = current.attempt;
    const attemptPromises: Promise<void>[] = [];

    for (let i = 1; i <= TOTAL_ATTEMPTS; i++) {
      if (i > 1 && stateRef.current.remaining.size === 0) break;
      nextAttempt += 1;
      attemptPromises.push(processAttempt(nextAttempt));
      if (i < TOTAL_ATTEMPTS) {
        await wait(DELAY_MS);
      }
    }

    await Promise.allSettled(attemptPromises);

    const finalSync = await syncWithServer(stateRef.current.courses);
    dispatch({ type: "FINISH_WAR" });

    const preparedCount = finalSync.courses.length;
    const successCount = finalSync.courses.filter(
      (c) => c.saved_in_submit === true,
    ).length;

    gooeyToast.success("Info Bosku", {
      description: "Perang berhasil diselesaikan",
    });
    if (activeUser) {
      trackWarCompleted(activeUser, { preparedCount, successCount });
    }
  }, [processAttempt, syncWithServer]);

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
        } catch {
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

  // Hydrate from localStorage once, then run the initial "is the war open"
  // sync — mirrors the original mount effect.
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
  // dangerous actions while a war is running on this page.
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
    logs: state.logs,
    securedCount,
    totalCount,
    checkWarStatus: syncWithServer,
    startWar,
    releaseCourses,
  };
}
