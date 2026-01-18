// Types pour les champs JSON
export interface Deliverable {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
}

export interface Resource {
  id: string;
  name: string;
  role: string;
  allocation?: number; // pourcentage 0-100
}

export interface Risk {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
  status: 'identified' | 'mitigated' | 'occurred' | 'closed';
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  archived?: boolean;
  created_at?: string;

  // Nouveaux champs gestion de projet
  objective?: string;
  start_date?: string;
  end_date?: string;
  status?: ProjectStatus;
  budget?: number;
  budget_spent?: number;
  success_criteria?: string;
  constraints?: string;
  deliverables?: Deliverable[];
  resources?: Resource[];
  risks?: Risk[];

  // Stats from API
  ticket_count?: number;
  ticket_done?: number;
  ticket_in_progress?: number;
  ticket_todo?: number;
}
