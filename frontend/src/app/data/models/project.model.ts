export interface Project {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  archived?: boolean;
  createdAt?: string;
  // Stats from API (camelCase)
  ticketCount?: number;
  ticketDone?: number;
  ticketTodo?: number;
  ticketInProgress?: number;
  // Legacy snake_case aliases
  ticket_count?: number;
  ticket_done?: number;
  ticket_in_progress?: number;
  ticket_todo?: number;
}
