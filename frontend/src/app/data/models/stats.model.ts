export interface Stats {
  total: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  overdue: number;
  completedThisWeek: number;
}

export interface ProductivityData {
  week: string;
  label: string;
  created: number;
  completed: number;
}

export interface DistributionItem {
  status?: string;
  priority?: string;
  count: number;
  percentage: number;
}

export interface DistributionData {
  byStatus: DistributionItem[];
  byPriority: DistributionItem[];
  total: number;
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
