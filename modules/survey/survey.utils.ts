import type { ActiveUserSession } from "./survey.types";

export function getActiveUserFromStorage(): ActiveUserSession | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const stored = localStorage.getItem("active_user");
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return {
      userId: parsed.userId || parsed.nim || "",
      nim: parsed.nim || "",
      degree: parsed.degree || "S1",
      studyProgram: parsed.studyProgram || parsed.major || "",
      major: parsed.major || "",
      name: parsed.name || "",
    };
  } catch {
    return null;
  }
}

export function preventEnterSubmit(e: React.KeyboardEvent): void {
  if (e.key === "Enter" && e.target instanceof HTMLElement && e.target.tagName !== "TEXTAREA") {
    e.preventDefault();
  }
}
