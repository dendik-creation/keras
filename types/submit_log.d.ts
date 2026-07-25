export type SubmitLog = {
  attempt: number;
  status: "pending" | "success";
  messages: {
    status: "success" | "error";
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
