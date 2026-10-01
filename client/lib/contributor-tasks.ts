import type { Assignment } from "./assignments";
import { apiRequest } from "./api-request";

export interface ContributorTask {
  id: string;
  assignmentId: string;
  status: string;
  createdAt: string;
  assignment: Assignment;
}

export function listContributorTasks() {
  return apiRequest<{ tasks: ContributorTask[] }>("/api/contributor/tasks");
}

export function startContributorTask(assignmentId: string) {
  return apiRequest<ContributorTask>("/api/contributor/tasks", {
    method: "POST",
    body: JSON.stringify({ assignmentId }),
  });
}
