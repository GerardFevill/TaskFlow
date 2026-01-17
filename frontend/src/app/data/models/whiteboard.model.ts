export type WhiteboardElementType =
  | 'sticky_note'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'text'
  | 'image'
  | 'connector'
  | 'freehand';

export type WhiteboardTool =
  | 'select'
  | 'pan'
  | 'sticky_note'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'connector'
  | 'text'
  | 'image'
  | 'freehand'
  | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface WhiteboardElement {
  id: number;
  board_id: number;
  type: WhiteboardElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill_color: string;
  stroke_color: string;
  stroke_width: number;
  opacity: number;
  text_content?: string;
  font_size?: number;
  font_family?: string;
  text_align?: 'left' | 'center' | 'right';
  line_style?: 'solid' | 'dashed' | 'dotted';
  start_arrow?: boolean;
  end_arrow?: boolean;
  start_element_id?: number;
  end_element_id?: number;
  start_anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  end_anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  path_data?: string;
  image_url?: string;
  image_filename?: string;
  z_index: number;
  locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Whiteboard {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  background_color: string;
  grid_enabled: boolean;
  grid_size: number;
  snap_to_grid: boolean;
  created_at?: string;
  updated_at?: string;
  element_count?: number;
}

export const STICKY_COLORS = [
  '#fef3bd', // Yellow
  '#d4f0fc', // Blue
  '#d4fcd4', // Green
  '#fcd4e8', // Pink
  '#e8d4fc', // Purple
  '#fcd4d4', // Red
  '#fce8d4', // Orange
  '#ffffff', // White
];

export const SHAPE_COLORS = [
  '#6c5ce7', // Purple
  '#00b894', // Green
  '#0984e3', // Blue
  '#fdcb6e', // Yellow
  '#e17055', // Orange
  '#d63031', // Red
  '#636e72', // Gray
  '#2d3436', // Dark
];
