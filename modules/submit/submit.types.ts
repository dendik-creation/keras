export interface PendingSubmission {
  requestId: string;
  nim: string;
  createdAt: number;
  priority: boolean;
  sessionCookie: string;
  checkboxValues: string[];
}
