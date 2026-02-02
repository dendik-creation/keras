export type SubmitLog = {
  attempt: number;
  status: "pending" | "success";
  messages: {
    status: "success" | "error";
    message: string;
  }[];
  timestamp: string;
  statusCode?: number;
};
