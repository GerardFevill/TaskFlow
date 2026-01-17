export interface Task {
  id: number;
  text: string;
  done: boolean;
  ticket_id: number;
  parent_id?: number;
  position?: number;
  subtasks?: Task[];
}
