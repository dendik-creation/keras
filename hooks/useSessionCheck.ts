import { useState, useEffect } from "react";
import axios from "axios";
import { getLocalStorage, setLocalStorage } from "@/helper/local_storage";

type UserData = {
  name: string;
  nim: string;
  major?: string;
  degree?: string;
};

export const useSessionCheck = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

      const currentTime = new Date().getTime();
      const sessionCheckPlanTime = getLocalStorage("session_check_plan_time");
      const planTime = sessionCheckPlanTime
        ? parseInt(sessionCheckPlanTime, 10)
        : 0;

      if (planTime > 0 && currentTime < planTime) {
        setUser(localUser);
        setIsAuthenticated(true);
        setIsValidating(false);
        return;
      }

      try {
        await axios.get("/api/session-check");

        const nextCheckTime = currentTime + 60 * 60 * 1000;
        setLocalStorage("session_check_plan_time", nextCheckTime.toString());

        setUser(localUser);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem("active_user");
        localStorage.removeItem("session_check_plan_time");
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsValidating(false);
      }
    };

    checkAuth();
  }, []);

  return { user, isAuthenticated, isValidating };
};
