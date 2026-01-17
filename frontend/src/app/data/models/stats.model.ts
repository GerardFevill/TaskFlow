export interface Stats {
  total: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  overdue: number;
  completedThisWeek: number;
}

export interface GanttItem {
  id: number;
  title: string;
  status: string;
  priority: string;
  start_date?: string;
  due_date?: string;
  time_estimated?: number;
  time_spent?: number;
}
