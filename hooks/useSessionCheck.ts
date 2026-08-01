import { useState, useEffect } from "react";
import axios from "axios";
import { getLocalStorage, removeLocalStorage } from "@/helper/local_storage";

type UserData = {
  name: string;
  nim: string;
  major?: string;
  degree?: string;
  avatarUrl?: string | null;
  avatarFetched?: boolean;
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
    let isMounted = true;

    const checkAuth = async () => {
      let localUser: UserData | null = null;
      try {
        const stored = getLocalStorage("active_user");
        localUser = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        localUser = null;
      }

      try {
        const response = await axios.get("/api/session-check");

        if (response.status === 200 && response.data?.authenticated) {
          if (!isMounted) return;
          setUser(localUser);
          setIsAuthenticated(true);
          setSessionIssue(null);
        } else {
          throw new Error("Unauthenticated");
        }
      } catch (error) {
        if (!isMounted) return;

        removeLocalStorage("active_user");
        removeLocalStorage("session_check_plan_time");
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("app_initialized");
        }

        const questionnaireUrl = axios.isAxiosError(error)
          ? error.response?.data?.questionnaireUrl
          : undefined;

        if (questionnaireUrl) {
          setSessionIssue({
            reason: "questionnaire_required",
            questionnaireUrl,
          });
        } else {
          setSessionIssue(null);
        }

        setIsAuthenticated(false);
        setUser(null);
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return { user, isAuthenticated, isValidating, sessionIssue };
};

