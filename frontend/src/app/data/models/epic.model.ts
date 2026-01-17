export interface Epic {
  id: number;
  name: string;
  description?: string;
  color: string;
  status: 'open' | 'in_progress' | 'completed';
  project_id: number;
  project_name?: string;
  project_color?: string;
  ticket_count?: number;
  ticket_done?: number;
  progress?: number;
  created_at?: string;
}
