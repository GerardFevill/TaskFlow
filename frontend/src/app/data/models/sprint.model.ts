export interface Sprint {
  id: number;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed';
  project_id: number;
  project_name?: string;
  project_color?: string;
  ticket_count?: number;
  ticket_done?: number;
  progress?: number;
  created_at?: string;
}
