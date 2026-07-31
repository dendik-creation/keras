export type AttemptStatus =
  | "waiting"
  | "preparing"
  | "processing"
  | "submitting"
  | "completed"
  | "failed"
  | "pending"
  | "success"
  | "skipped";

export type PreparationStatus =
  | "idle"
  | "preparing"
  | "completed"
  | "failed";

export type SubmitLog = {
  attempt: number;
  phase?: number;
  status: AttemptStatus;
  reason?: string;
  messages: {
    status: "success" | "error" | "info" | "skipped";
    message: string;
  }[];
  timestamp: string;
  statusCode?: number;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  successCount?: number;
  failureCount?: number;
  affectedCourses?: {
    code: string;
    class: string;
    result: "success" | "error";
  }[];
};



