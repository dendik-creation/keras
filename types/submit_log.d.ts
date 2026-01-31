export type SubmitLog = {
  attempt: number;
  status: "pending" | "success" | "error";
  messages: {
    status: "success" | "error";
    message: string;
  }[];
  timestamp: string;
  statusCode?: number;
};
