export interface Milestone {
  id: number;
  name: string;
  description?: string;
  due_date: string;
  status: 'open' | 'closed';
  project_id: number;
  project_name?: string;
  project_color?: string;
  ticket_count?: number;
  ticket_done?: number;
  progress?: number;
  created_at?: string;
}
