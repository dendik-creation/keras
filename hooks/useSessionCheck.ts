import { useState, useEffect } from "react";
import axios from "axios";
import { getLocalStorage, setLocalStorage } from "@/helper/local_storage";

type UserData = {
  name: string;
  nim: string;
  major?: string;
  degree?: string;
};

type SessionIssue = {
  reason: "questionnaire_required";
  questionnaireUrl: string;
};

export const useSessionCheck = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionIssue, setSessionIssue] = useState<SessionIssue | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      let localUser: UserData | null = null;
      try {
        const stored = getLocalStorage("active_user");
        localUser = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        localUser = null;
      }

      if (!localUser) {
        setIsValidating(false);
        setIsAuthenticated(false);
        return;
      }

      const isNewBrowserSession =
        typeof window !== "undefined" &&
        !sessionStorage.getItem("app_initialized");

      const currentTime = new Date().getTime();
      const sessionCheckPlanTime = getLocalStorage("session_check_plan_time");
      const planTime = sessionCheckPlanTime
        ? parseInt(sessionCheckPlanTime, 10)
        : 0;

      if (!isNewBrowserSession && planTime > 0 && currentTime < planTime) {
        setUser(localUser);
        setIsAuthenticated(true);
        setIsValidating(false);
        return;
      }

      try {
        await axios.get("/api/session-check");

        // Update cache 15 menit
        const nextCheckTime = currentTime + 15 * 60 * 1000;
        setLocalStorage("session_check_plan_time", nextCheckTime.toString());
        sessionStorage.setItem("app_initialized", "true");

        setUser(localUser);
        setIsAuthenticated(true);
      } catch (error) {
        const questionnaireUrl = axios.isAxiosError(error)
          ? error.response?.data?.questionnaireUrl
          : undefined;
        if (questionnaireUrl) {
          setSessionIssue({
            reason: "questionnaire_required",
            questionnaireUrl,
          });
        } else if (typeof window !== "undefined") {
          localStorage.removeItem("active_user");
          localStorage.removeItem("session_check_plan_time");
        }
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsValidating(false);
      }
    };

    checkAuth();
  }, []);

  return { user, isAuthenticated, isValidating, sessionIssue };
};
