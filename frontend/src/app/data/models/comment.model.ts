export interface Reaction {
  emoji: string;
  count: number;
}

export interface Comment {
  id: number;
  text: string;
  created_at: string;
  ticket_id: number;
  reactions?: Reaction[];
}
