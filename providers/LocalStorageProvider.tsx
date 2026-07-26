"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getLocalStorage,
  setLocalStorage,
  LOCAL_STORAGE_WRITE_EVENT,
} from "@/helper/local_storage";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { backfillCourseSemesters } from "@/helper/frontend_helper";

const OFFERING_COURSE_KEY = "offering_course";
const SAVED_SCHEDULE_KEY = "krs_saved_schedule";
export const WAR_IN_PROGRESS_KEY = "krs_war_in_progress";

type LocalStorageContextValue = {
  offeringCourse: OfferingCourse[] | null;
  savedSchedule: CourseSchedule[] | null;
  isWarInProgress: boolean;
  isHydrated: boolean;
  setOfferingCourse: (data: OfferingCourse[]) => void;
  setSavedSchedule: (data: CourseSchedule[]) => void;
};

const LocalStorageContext = createContext<LocalStorageContextValue | null>(
  null,
);

/**
 * Single source of truth for `offering_course` / `krs_saved_schedule`.
 * Reads both once on mount and reports `isHydrated` so consumers never race
 * the first render against localStorage. Writes made outside this provider's
 * own setters (e.g. /submit, which touches krs_saved_schedule directly) are
 * picked up via the `ls-write` event `setLocalStorage` dispatches on every
 * write, plus the native `storage` event for cross-tab sync — otherwise the
 * provider's React state would go stale relative to localStorage.
 */
export function LocalStorageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lazy initializers read localStorage synchronously (SSR-safe — getLocalStorage
  // returns null server-side) so there's no extra render between mount and
  // having real values; the effect below only has to flip `isHydrated`.
  const [offeringCourse, setOfferingCourseState] = useState<
    OfferingCourse[] | null
  >(() => getLocalStorage(OFFERING_COURSE_KEY));
  const [savedSchedule, setSavedScheduleState] = useState<
    CourseSchedule[] | null
  >(() => getLocalStorage(SAVED_SCHEDULE_KEY));
  const [isWarInProgress, setIsWarInProgress] = useState<boolean>(
    () => getLocalStorage(WAR_IN_PROGRESS_KEY) === true,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const writingKeysRef = useRef(new Set<string>());

  const readKey = useCallback((key: string) => {
    if (key === OFFERING_COURSE_KEY) {
      setOfferingCourseState(getLocalStorage(OFFERING_COURSE_KEY));
    } else if (key === SAVED_SCHEDULE_KEY) {
      setSavedScheduleState(getLocalStorage(SAVED_SCHEDULE_KEY));
    } else if (key === WAR_IN_PROGRESS_KEY) {
      setIsWarInProgress(getLocalStorage(WAR_IN_PROGRESS_KEY) === true);
    }
  }, []);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key) readKey(event.key);
    };
    const onLocalWrite = (event: Event) => {
      const key = (event as CustomEvent<{ key: string }>).detail?.key;
      // Skip re-reads for writes this provider just performed itself —
      // state is already up to date, and re-reading is redundant.
      if (key && writingKeysRef.current.has(key)) return;
      if (key) readKey(key);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_STORAGE_WRITE_EVENT, onLocalWrite);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_STORAGE_WRITE_EVENT, onLocalWrite);
    };
  }, [readKey]);

  const setOfferingCourse = useCallback((data: OfferingCourse[]) => {
    writingKeysRef.current.add(OFFERING_COURSE_KEY);
    setLocalStorage(OFFERING_COURSE_KEY, data);
    setOfferingCourseState(data);
    writingKeysRef.current.delete(OFFERING_COURSE_KEY);
  }, []);

  const setSavedSchedule = useCallback((data: CourseSchedule[]) => {
    writingKeysRef.current.add(SAVED_SCHEDULE_KEY);
    setLocalStorage(SAVED_SCHEDULE_KEY, data);
    setSavedScheduleState(data);
    writingKeysRef.current.delete(SAVED_SCHEDULE_KEY);
  }, []);

  // One-time backfill: patch `semester` onto saved courses that predate the
  // field, matched by code against offering_course. No-ops once every saved
  // course already has a semester.
  useEffect(() => {
    if (!isHydrated) return;
    if (!savedSchedule || savedSchedule.length === 0) return;
    if (!offeringCourse || offeringCourse.length === 0) return;

    const patched = backfillCourseSemesters(savedSchedule, offeringCourse);
    if (patched !== savedSchedule) setSavedSchedule(patched);
  }, [isHydrated, savedSchedule, offeringCourse, setSavedSchedule]);

  return (
    <LocalStorageContext.Provider
      value={{
        offeringCourse,
        savedSchedule,
        isWarInProgress,
        isHydrated,
        setOfferingCourse,
        setSavedSchedule,
      }}
    >
      {children}
    </LocalStorageContext.Provider>
  );
}

export function useLocalStorageContext(): LocalStorageContextValue {
  const ctx = useContext(LocalStorageContext);
  if (!ctx) {
    throw new Error(
      "useLocalStorageContext must be used within a LocalStorageProvider",
    );
  }
  return ctx;
}
