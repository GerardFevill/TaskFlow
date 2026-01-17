export interface AdvancedSearchParams {
  query?: string;
  status?: string[];
  priority?: string[];
  labels?: number[];
  dateFrom?: string;
  dateTo?: string;
  projectId?: number;
  epicId?: number;
  milestoneId?: number;
  sprintId?: number;
  pinned?: boolean;
}
