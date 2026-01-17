import { pgTable, serial, varchar, text, boolean, integer, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';

export const whiteboards = pgTable('whiteboards', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull().default('Whiteboard'),
  description: text('description').default(''),
  viewportX: decimal('viewport_x', { precision: 10, scale: 2 }).default('0'),
  viewportY: decimal('viewport_y', { precision: 10, scale: 2 }).default('0'),
  viewportZoom: decimal('viewport_zoom', { precision: 5, scale: 3 }).default('1.0'),
  backgroundColor: varchar('background_color', { length: 9 }).default('#1a1a2e'),
  gridEnabled: boolean('grid_enabled').default(true),
  gridSize: integer('grid_size').default(20),
  snapToGrid: boolean('snap_to_grid').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_whiteboards_project_id').on(table.projectId),
]);

export const whiteboardElements = pgTable('whiteboard_elements', {
  id: serial('id').primaryKey(),
  boardId: integer('board_id').references(() => whiteboards.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(),
  x: decimal('x', { precision: 10, scale: 2 }).notNull().default('0'),
  y: decimal('y', { precision: 10, scale: 2 }).notNull().default('0'),
  width: decimal('width', { precision: 10, scale: 2 }).default('200'),
  height: decimal('height', { precision: 10, scale: 2 }).default('100'),
  rotation: decimal('rotation', { precision: 6, scale: 2 }).default('0'),
  fillColor: varchar('fill_color', { length: 9 }).default('#fef3bd'),
  strokeColor: varchar('stroke_color', { length: 9 }).default('#333333'),
  strokeWidth: decimal('stroke_width', { precision: 4, scale: 2 }).default('1'),
  opacity: decimal('opacity', { precision: 3, scale: 2 }).default('1'),
  textContent: text('text_content').default(''),
  fontSize: integer('font_size').default(14),
  fontFamily: varchar('font_family', { length: 100 }).default('Segoe UI'),
  textAlign: varchar('text_align', { length: 10 }).default('left'),
  lineStyle: varchar('line_style', { length: 10 }).default('solid'),
  startArrow: boolean('start_arrow').default(false),
  endArrow: boolean('end_arrow').default(false),
  startElementId: integer('start_element_id'),
  endElementId: integer('end_element_id'),
  startAnchor: varchar('start_anchor', { length: 10 }).default('center'),
  endAnchor: varchar('end_anchor', { length: 10 }).default('center'),
  pathData: text('path_data'),
  imageUrl: varchar('image_url', { length: 500 }),
  imageFilename: varchar('image_filename', { length: 255 }),
  zIndex: integer('z_index').default(0),
  locked: boolean('locked').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_whiteboard_elements_board_id').on(table.boardId),
  index('idx_whiteboard_elements_z_index').on(table.zIndex),
]);

export type Whiteboard = typeof whiteboards.$inferSelect;
export type NewWhiteboard = typeof whiteboards.$inferInsert;
export type WhiteboardElement = typeof whiteboardElements.$inferSelect;
export type NewWhiteboardElement = typeof whiteboardElements.$inferInsert;
