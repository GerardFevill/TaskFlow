export interface Activity {
  id: number;
  ticket_id: number;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface GlobalActivity extends Activity {
  ticket_title: string;
}
