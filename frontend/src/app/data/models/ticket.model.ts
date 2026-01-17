import { Label } from './label.model';
import { Task } from './task.model';

export interface Ticket {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'do' | 'plan' | 'delegate' | 'eliminate';
  description?: string;
  due_date?: string;
  start_date?: string;
  position?: number;
  archived?: boolean;
  pinned?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminder_days?: number;
  time_estimated?: number;
  time_spent?: number;
  project_id?: number;
  project_name?: string;
  project_color?: string;
  epic_id?: number;
  epic_name?: string;
  milestone_id?: number;
  milestone_name?: string;
  sprint_id?: number;
  sprint_name?: string;
  created_at?: string;
  task_count?: number;
  task_done?: number;
  tasks?: Task[];
  labels?: Label[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number | null;
  offset: number;
}

export interface TicketQueryParams {
  project_id?: number;
  epic_id?: number;
  milestone_id?: number;
  sprint_id?: number;
  status?: string;
  priority?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
}
