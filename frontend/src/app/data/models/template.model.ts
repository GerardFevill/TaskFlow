export interface Template {
  id: number;
  name: string;
  title: string;
  description?: string;
  priority: string;
  project_id?: number;
  project_name?: string;
  project_color?: string;
  created_at?: string;
}
