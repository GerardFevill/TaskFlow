var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// src/tools/projects.ts
import { z } from "zod";
import { eq, sql, and } from "drizzle-orm";

// src/db/index.ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// src/db/schema/index.ts
var schema_exports = {};
__export(schema_exports, {
  activityLog: () => activityLog,
  attachments: () => attachments,
  comments: () => comments,
  epics: () => epics,
  labels: () => labels,
  milestones: () => milestones,
  projects: () => projects,
  settings: () => settings,
  sprints: () => sprints,
  tasks: () => tasks,
  ticketDependencies: () => ticketDependencies,
  ticketLabels: () => ticketLabels,
  ticketTemplates: () => ticketTemplates,
  tickets: () => tickets,
  whiteboardElements: () => whiteboardElements,
  whiteboards: () => whiteboards
});

// src/db/schema/projects.ts
import { pgTable, serial, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
var projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").default(""),
  color: varchar("color", { length: 7 }).default("#6c5ce7"),
  icon: varchar("icon", { length: 50 }).default("fa-folder"),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// src/db/schema/tickets.ts
import { pgTable as pgTable2, serial as serial2, varchar as varchar2, text as text2, boolean as boolean2, integer, date, timestamp as timestamp2, index } from "drizzle-orm/pg-core";
var tickets = pgTable2("tickets", {
  id: serial2("id").primaryKey(),
  title: varchar2("title", { length: 255 }).notNull(),
  status: varchar2("status", { length: 20 }).default("todo"),
  priority: varchar2("priority", { length: 20 }).default("do"),
  description: text2("description").default(""),
  dueDate: date("due_date"),
  startDate: date("start_date"),
  position: integer("position").default(0),
  archived: boolean2("archived").default(false),
  pinned: boolean2("pinned").default(false),
  recurrence: varchar2("recurrence", { length: 20 }).default("none"),
  reminderDays: integer("reminder_days").default(0),
  timeEstimated: integer("time_estimated").default(0),
  timeSpent: integer("time_spent").default(0),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }).default(1),
  epicId: integer("epic_id"),
  milestoneId: integer("milestone_id"),
  sprintId: integer("sprint_id"),
  searchVector: text2("search_vector"),
  createdAt: timestamp2("created_at").defaultNow()
}, (table) => ({
  projectIdIdx: index("idx_tickets_project_id").on(table.projectId),
  statusIdx: index("idx_tickets_status").on(table.status),
  priorityIdx: index("idx_tickets_priority").on(table.priority),
  archivedIdx: index("idx_tickets_archived").on(table.archived),
  dueDateIdx: index("idx_tickets_due_date").on(table.dueDate),
  pinnedIdx: index("idx_tickets_pinned").on(table.pinned)
}));

// src/db/schema/tasks.ts
import { pgTable as pgTable3, serial as serial3, varchar as varchar3, boolean as boolean3, integer as integer2, index as index2 } from "drizzle-orm/pg-core";
var tasks = pgTable3("tasks", {
  id: serial3("id").primaryKey(),
  text: varchar3("text", { length: 255 }).notNull(),
  done: boolean3("done").default(false),
  position: integer2("position").default(0),
  ticketId: integer2("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
  parentId: integer2("parent_id")
}, (table) => ({
  ticketIdIdx: index2("idx_tasks_ticket_id").on(table.ticketId),
  parentIdIdx: index2("idx_tasks_parent_id").on(table.parentId)
}));

// src/db/schema/labels.ts
import { pgTable as pgTable4, serial as serial4, varchar as varchar4, integer as integer3, primaryKey } from "drizzle-orm/pg-core";
var labels = pgTable4("labels", {
  id: serial4("id").primaryKey(),
  name: varchar4("name", { length: 50 }).notNull(),
  color: varchar4("color", { length: 7 }).default("#4ecdc4")
});
var ticketLabels = pgTable4("ticket_labels", {
  ticketId: integer3("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  labelId: integer3("label_id").references(() => labels.id, { onDelete: "cascade" }).notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.ticketId, table.labelId] })
}));

// src/db/schema/comments.ts
import { pgTable as pgTable5, serial as serial5, text as text3, timestamp as timestamp3, integer as integer4, index as index3 } from "drizzle-orm/pg-core";
var comments = pgTable5("comments", {
  id: serial5("id").primaryKey(),
  text: text3("text").notNull(),
  createdAt: timestamp3("created_at").defaultNow(),
  ticketId: integer4("ticket_id").references(() => tickets.id, { onDelete: "cascade" })
}, (table) => ({
  ticketIdIdx: index3("idx_comments_ticket_id").on(table.ticketId)
}));

// src/db/schema/attachments.ts
import { pgTable as pgTable6, serial as serial6, varchar as varchar5, integer as integer5, timestamp as timestamp4, index as index4 } from "drizzle-orm/pg-core";
var attachments = pgTable6("attachments", {
  id: serial6("id").primaryKey(),
  filename: varchar5("filename", { length: 255 }).notNull(),
  originalName: varchar5("original_name", { length: 255 }).notNull(),
  mimetype: varchar5("mimetype", { length: 100 }),
  size: integer5("size"),
  ticketId: integer5("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => ({
  ticketIdIdx: index4("idx_attachments_ticket_id").on(table.ticketId)
}));

// src/db/schema/activity.ts
import { pgTable as pgTable7, serial as serial7, varchar as varchar6, text as text4, timestamp as timestamp5, integer as integer6, index as index5 } from "drizzle-orm/pg-core";
var activityLog = pgTable7("activity_log", {
  id: serial7("id").primaryKey(),
  ticketId: integer6("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
  action: varchar6("action", { length: 50 }).notNull(),
  field: varchar6("field", { length: 50 }),
  oldValue: text4("old_value"),
  newValue: text4("new_value"),
  createdAt: timestamp5("created_at").defaultNow()
}, (table) => ({
  ticketIdIdx: index5("idx_activity_log_ticket_id").on(table.ticketId),
  createdAtIdx: index5("idx_activity_log_created_at").on(table.createdAt)
}));

// src/db/schema/templates.ts
import { pgTable as pgTable8, serial as serial8, varchar as varchar7, text as text5, timestamp as timestamp6, integer as integer7 } from "drizzle-orm/pg-core";
var ticketTemplates = pgTable8("ticket_templates", {
  id: serial8("id").primaryKey(),
  name: varchar7("name", { length: 255 }).notNull(),
  title: varchar7("title", { length: 255 }).notNull(),
  description: text5("description").default(""),
  priority: varchar7("priority", { length: 20 }).default("do"),
  projectId: integer7("project_id").references(() => projects.id, { onDelete: "set null" }),
  createdAt: timestamp6("created_at").defaultNow()
});

// src/db/schema/dependencies.ts
import { pgTable as pgTable9, serial as serial9, integer as integer8, unique, index as index6 } from "drizzle-orm/pg-core";
var ticketDependencies = pgTable9("ticket_dependencies", {
  id: serial9("id").primaryKey(),
  ticketId: integer8("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  dependsOnId: integer8("depends_on_id").references(() => tickets.id, { onDelete: "cascade" }).notNull()
}, (table) => ({
  uniq: unique().on(table.ticketId, table.dependsOnId),
  ticketIdIdx: index6("idx_ticket_dependencies_ticket_id").on(table.ticketId),
  dependsOnIdIdx: index6("idx_ticket_dependencies_depends_on_id").on(table.dependsOnId)
}));

// src/db/schema/settings.ts
import { pgTable as pgTable10, varchar as varchar8, text as text6 } from "drizzle-orm/pg-core";
var settings = pgTable10("settings", {
  key: varchar8("key", { length: 100 }).primaryKey(),
  value: text6("value").notNull()
});

// src/db/schema/epics.ts
import { pgTable as pgTable11, serial as serial10, varchar as varchar9, text as text7, timestamp as timestamp7, integer as integer9, index as index7 } from "drizzle-orm/pg-core";
var epics = pgTable11("epics", {
  id: serial10("id").primaryKey(),
  name: varchar9("name", { length: 255 }).notNull(),
  description: text7("description").default(""),
  color: varchar9("color", { length: 7 }).default("#6c5ce7"),
  status: varchar9("status", { length: 20 }).default("open"),
  projectId: integer9("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp7("created_at").defaultNow()
}, (table) => ({
  projectIdIdx: index7("idx_epics_project_id").on(table.projectId)
}));

// src/db/schema/milestones.ts
import { pgTable as pgTable12, serial as serial11, varchar as varchar10, text as text8, date as date2, timestamp as timestamp8, integer as integer10, index as index8 } from "drizzle-orm/pg-core";
var milestones = pgTable12("milestones", {
  id: serial11("id").primaryKey(),
  name: varchar10("name", { length: 255 }).notNull(),
  description: text8("description").default(""),
  dueDate: date2("due_date").notNull(),
  status: varchar10("status", { length: 20 }).default("open"),
  projectId: integer10("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp8("created_at").defaultNow()
}, (table) => ({
  projectIdIdx: index8("idx_milestones_project_id").on(table.projectId)
}));

// src/db/schema/sprints.ts
import { pgTable as pgTable13, serial as serial12, varchar as varchar11, text as text9, date as date3, timestamp as timestamp9, integer as integer11, index as index9 } from "drizzle-orm/pg-core";
var sprints = pgTable13("sprints", {
  id: serial12("id").primaryKey(),
  name: varchar11("name", { length: 255 }).notNull(),
  goal: text9("goal").default(""),
  startDate: date3("start_date").notNull(),
  endDate: date3("end_date").notNull(),
  status: varchar11("status", { length: 20 }).default("planning"),
  projectId: integer11("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp9("created_at").defaultNow()
}, (table) => ({
  projectIdIdx: index9("idx_sprints_project_id").on(table.projectId)
}));

// src/db/schema/whiteboards.ts
import { pgTable as pgTable14, serial as serial13, varchar as varchar12, text as text10, boolean as boolean4, integer as integer12, decimal, timestamp as timestamp10, index as index10 } from "drizzle-orm/pg-core";
var whiteboards = pgTable14("whiteboards", {
  id: serial13("id").primaryKey(),
  projectId: integer12("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar12("name", { length: 255 }).notNull().default("Whiteboard"),
  description: text10("description").default(""),
  viewportX: decimal("viewport_x", { precision: 10, scale: 2 }).default("0"),
  viewportY: decimal("viewport_y", { precision: 10, scale: 2 }).default("0"),
  viewportZoom: decimal("viewport_zoom", { precision: 5, scale: 3 }).default("1.0"),
  backgroundColor: varchar12("background_color", { length: 9 }).default("#1a1a2e"),
  gridEnabled: boolean4("grid_enabled").default(true),
  gridSize: integer12("grid_size").default(20),
  snapToGrid: boolean4("snap_to_grid").default(false),
  createdAt: timestamp10("created_at").defaultNow(),
  updatedAt: timestamp10("updated_at").defaultNow()
}, (table) => ({
  projectIdIdx: index10("idx_whiteboards_project_id").on(table.projectId)
}));
var whiteboardElements = pgTable14("whiteboard_elements", {
  id: serial13("id").primaryKey(),
  boardId: integer12("board_id").references(() => whiteboards.id, { onDelete: "cascade" }),
  type: varchar12("type", { length: 20 }).notNull(),
  x: decimal("x", { precision: 10, scale: 2 }).notNull().default("0"),
  y: decimal("y", { precision: 10, scale: 2 }).notNull().default("0"),
  width: decimal("width", { precision: 10, scale: 2 }).default("200"),
  height: decimal("height", { precision: 10, scale: 2 }).default("100"),
  rotation: decimal("rotation", { precision: 6, scale: 2 }).default("0"),
  fillColor: varchar12("fill_color", { length: 9 }).default("#fef3bd"),
  strokeColor: varchar12("stroke_color", { length: 9 }).default("#333333"),
  strokeWidth: decimal("stroke_width", { precision: 4, scale: 2 }).default("1"),
  opacity: decimal("opacity", { precision: 3, scale: 2 }).default("1"),
  textContent: text10("text_content").default(""),
  fontSize: integer12("font_size").default(14),
  fontFamily: varchar12("font_family", { length: 100 }).default("Segoe UI"),
  textAlign: varchar12("text_align", { length: 10 }).default("left"),
  lineStyle: varchar12("line_style", { length: 10 }).default("solid"),
  startArrow: boolean4("start_arrow").default(false),
  endArrow: boolean4("end_arrow").default(false),
  startElementId: integer12("start_element_id"),
  endElementId: integer12("end_element_id"),
  startAnchor: varchar12("start_anchor", { length: 10 }).default("center"),
  endAnchor: varchar12("end_anchor", { length: 10 }).default("center"),
  pathData: text10("path_data"),
  imageUrl: varchar12("image_url", { length: 500 }),
  imageFilename: varchar12("image_filename", { length: 255 }),
  zIndex: integer12("z_index").default(0),
  locked: boolean4("locked").default(false),
  createdAt: timestamp10("created_at").defaultNow(),
  updatedAt: timestamp10("updated_at").defaultNow()
}, (table) => ({
  boardIdIdx: index10("idx_whiteboard_elements_board_id").on(table.boardId),
  zIndexIdx: index10("idx_whiteboard_elements_z_index").on(table.zIndex)
}));

// src/db/index.ts
var pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "avalis",
  password: process.env.DB_PASSWORD || "avalis",
  database: process.env.DB_NAME || "gestion_projet"
});
var db = drizzle(pool, { schema: schema_exports });

// src/tools/projects.ts
function registerProjectTools(server2) {
  server2.tool(
    "list_projects",
    "Liste tous les projets actifs avec le nombre de tickets par statut",
    {},
    async () => {
      const allProjects = await db.select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        icon: projects.icon,
        archived: projects.archived,
        createdAt: projects.createdAt,
        totalTickets: sql`count(${tickets.id})::int`,
        todoCount: sql`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
        inProgressCount: sql`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
        doneCount: sql`count(case when ${tickets.status} = 'done' then 1 end)::int`
      }).from(projects).leftJoin(tickets, and(eq(tickets.projectId, projects.id), eq(tickets.archived, false))).where(eq(projects.archived, false)).groupBy(projects.id).orderBy(projects.name);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(allProjects, null, 2)
        }]
      };
    }
  );
  server2.tool(
    "get_project",
    "Detail d'un projet avec ses statistiques",
    { project_id: z.number().describe("ID du projet") },
    async ({ project_id }) => {
      const [project] = await db.select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        icon: projects.icon,
        archived: projects.archived,
        createdAt: projects.createdAt,
        totalTickets: sql`count(${tickets.id})::int`,
        todoCount: sql`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
        inProgressCount: sql`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
        doneCount: sql`count(case when ${tickets.status} = 'done' then 1 end)::int`
      }).from(projects).leftJoin(tickets, and(eq(tickets.projectId, projects.id), eq(tickets.archived, false))).where(eq(projects.id, project_id)).groupBy(projects.id);
      if (!project) {
        return { content: [{ type: "text", text: `Projet #${project_id} non trouve` }] };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }]
      };
    }
  );
}

// src/tools/tickets.ts
import { z as z2 } from "zod";
import { eq as eq2, and as and2, desc, sql as sql2 } from "drizzle-orm";
function registerTicketTools(server2) {
  server2.tool(
    "list_tickets",
    "Liste les tickets avec filtres optionnels (projet, statut, priorite)",
    {
      project_id: z2.number().optional().describe("Filtrer par projet"),
      status: z2.enum(["todo", "in_progress", "done"]).optional().describe("Filtrer par statut"),
      priority: z2.enum(["do", "plan", "delegate", "eliminate"]).optional().describe("Filtrer par priorite"),
      limit: z2.number().optional().default(50).describe("Nombre max de resultats (defaut: 50)")
    },
    async ({ project_id, status, priority, limit }) => {
      const conditions = [eq2(tickets.archived, false)];
      if (project_id) conditions.push(eq2(tickets.projectId, project_id));
      if (status) conditions.push(eq2(tickets.status, status));
      if (priority) conditions.push(eq2(tickets.priority, priority));
      const result = await db.select({
        id: tickets.id,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
        dueDate: tickets.dueDate,
        projectId: tickets.projectId,
        pinned: tickets.pinned,
        timeEstimated: tickets.timeEstimated,
        timeSpent: tickets.timeSpent,
        createdAt: tickets.createdAt
      }).from(tickets).where(and2(...conditions)).orderBy(desc(tickets.pinned), desc(tickets.createdAt)).limit(limit || 50);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );
  server2.tool(
    "get_ticket",
    "Detail complet d'un ticket avec tasks, labels et commentaires",
    { ticket_id: z2.number().describe("ID du ticket") },
    async ({ ticket_id }) => {
      const [ticket] = await db.select().from(tickets).where(eq2(tickets.id, ticket_id));
      if (!ticket) {
        return { content: [{ type: "text", text: `Ticket #${ticket_id} non trouve` }] };
      }
      const ticketTasks = await db.select().from(tasks).where(eq2(tasks.ticketId, ticket_id)).orderBy(tasks.position);
      const ticketLabelRows = await db.select({ id: labels.id, name: labels.name, color: labels.color }).from(ticketLabels).innerJoin(labels, eq2(ticketLabels.labelId, labels.id)).where(eq2(ticketLabels.ticketId, ticket_id));
      const ticketComments = await db.select().from(comments).where(eq2(comments.ticketId, ticket_id)).orderBy(desc(comments.createdAt));
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...ticket,
            tasks: ticketTasks,
            labels: ticketLabelRows,
            comments: ticketComments
          }, null, 2)
        }]
      };
    }
  );
  server2.tool(
    "search_tickets",
    "Recherche de tickets par texte (titre et description)",
    {
      query: z2.string().describe("Terme de recherche"),
      project_id: z2.number().optional().describe("Filtrer par projet")
    },
    async ({ query, project_id }) => {
      const conditions = [
        eq2(tickets.archived, false),
        sql2`(${tickets.title} ILIKE ${"%" + query + "%"} OR ${tickets.description} ILIKE ${"%" + query + "%"})`
      ];
      if (project_id) conditions.push(eq2(tickets.projectId, project_id));
      const result = await db.select({
        id: tickets.id,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
        description: tickets.description,
        projectId: tickets.projectId,
        dueDate: tickets.dueDate
      }).from(tickets).where(and2(...conditions)).limit(20);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );
  server2.tool(
    "create_ticket",
    "Creer un nouveau ticket",
    {
      title: z2.string().describe("Titre du ticket"),
      project_id: z2.number().optional().describe("ID du projet"),
      status: z2.enum(["todo", "in_progress", "done"]).optional().default("todo").describe("Statut"),
      priority: z2.enum(["do", "plan", "delegate", "eliminate"]).optional().default("do").describe("Priorite"),
      description: z2.string().optional().default("").describe("Description"),
      due_date: z2.string().optional().describe("Date d'echeance (YYYY-MM-DD)")
    },
    async ({ title, project_id, status, priority, description, due_date }) => {
      const [maxPos] = await db.select({ max: sql2`coalesce(max(${tickets.position}), 0)` }).from(tickets);
      const [newTicket] = await db.insert(tickets).values({
        title,
        status: status || "todo",
        priority: priority || "do",
        description: description || "",
        dueDate: due_date || null,
        projectId: project_id || 1,
        position: (maxPos?.max || 0) + 1
      }).returning();
      return {
        content: [{ type: "text", text: JSON.stringify(newTicket, null, 2) }]
      };
    }
  );
  server2.tool(
    "update_ticket",
    "Modifier un ticket existant",
    {
      ticket_id: z2.number().describe("ID du ticket"),
      title: z2.string().optional().describe("Nouveau titre"),
      status: z2.enum(["todo", "in_progress", "done"]).optional().describe("Nouveau statut"),
      priority: z2.enum(["do", "plan", "delegate", "eliminate"]).optional().describe("Nouvelle priorite"),
      description: z2.string().optional().describe("Nouvelle description"),
      due_date: z2.string().optional().describe("Nouvelle date d'echeance (YYYY-MM-DD)"),
      archived: z2.boolean().optional().describe("Archiver/desarchiver")
    },
    async ({ ticket_id, title, status, priority, description, due_date, archived }) => {
      const updates = {};
      if (title !== void 0) updates.title = title;
      if (status !== void 0) updates.status = status;
      if (priority !== void 0) updates.priority = priority;
      if (description !== void 0) updates.description = description;
      if (due_date !== void 0) updates.dueDate = due_date;
      if (archived !== void 0) updates.archived = archived;
      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text", text: "Aucune modification specifiee" }] };
      }
      const [updated] = await db.update(tickets).set(updates).where(eq2(tickets.id, ticket_id)).returning();
      if (!updated) {
        return { content: [{ type: "text", text: `Ticket #${ticket_id} non trouve` }] };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }]
      };
    }
  );
}

// src/tools/tasks.ts
import { z as z3 } from "zod";
import { eq as eq3, sql as sql3 } from "drizzle-orm";
function registerTaskTools(server2) {
  server2.tool(
    "list_tasks",
    "Liste les tasks d'un ticket",
    { ticket_id: z3.number().describe("ID du ticket") },
    async ({ ticket_id }) => {
      const result = await db.select().from(tasks).where(eq3(tasks.ticketId, ticket_id)).orderBy(tasks.position);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );
  server2.tool(
    "create_task",
    "Ajouter une task a un ticket",
    {
      ticket_id: z3.number().describe("ID du ticket"),
      text: z3.string().describe("Texte de la task"),
      parent_id: z3.number().optional().describe("ID de la task parente (pour sous-tache)")
    },
    async ({ ticket_id, text: text11, parent_id }) => {
      const [maxPos] = await db.select({ max: sql3`coalesce(max(${tasks.position}), 0)` }).from(tasks).where(eq3(tasks.ticketId, ticket_id));
      const [newTask] = await db.insert(tasks).values({
        text: text11,
        ticketId: ticket_id,
        parentId: parent_id || null,
        position: (maxPos?.max || 0) + 1
      }).returning();
      return {
        content: [{ type: "text", text: JSON.stringify(newTask, null, 2) }]
      };
    }
  );
  server2.tool(
    "update_task",
    "Modifier une task (texte ou statut done)",
    {
      task_id: z3.number().describe("ID de la task"),
      text: z3.string().optional().describe("Nouveau texte"),
      done: z3.boolean().optional().describe("Marquer comme terminee")
    },
    async ({ task_id, text: text11, done }) => {
      const updates = {};
      if (text11 !== void 0) updates.text = text11;
      if (done !== void 0) updates.done = done;
      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text", text: "Aucune modification specifiee" }] };
      }
      const [updated] = await db.update(tasks).set(updates).where(eq3(tasks.id, task_id)).returning();
      if (!updated) {
        return { content: [{ type: "text", text: `Task #${task_id} non trouvee` }] };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }]
      };
    }
  );
}

// src/tools/comments.ts
import { z as z4 } from "zod";
function registerCommentTools(server2) {
  server2.tool(
    "add_comment",
    "Ajouter un commentaire a un ticket",
    {
      ticket_id: z4.number().describe("ID du ticket"),
      text: z4.string().describe("Texte du commentaire")
    },
    async ({ ticket_id, text: text11 }) => {
      const [newComment] = await db.insert(comments).values({
        text: text11,
        ticketId: ticket_id
      }).returning();
      return {
        content: [{ type: "text", text: JSON.stringify(newComment, null, 2) }]
      };
    }
  );
}

// src/tools/stats.ts
import { z as z5 } from "zod";
import { eq as eq4, and as and3, sql as sql4 } from "drizzle-orm";
function registerStatsTools(server2) {
  server2.tool(
    "get_stats",
    "Statistiques globales ou par projet (tickets par statut, priorite, en retard, etc.)",
    {
      project_id: z5.number().optional().describe("ID du projet (optionnel, sinon stats globales)")
    },
    async ({ project_id }) => {
      const conditions = [eq4(tickets.archived, false)];
      if (project_id) conditions.push(eq4(tickets.projectId, project_id));
      const [stats] = await db.select({
        total: sql4`count(*)::int`,
        todo: sql4`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
        inProgress: sql4`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
        done: sql4`count(case when ${tickets.status} = 'done' then 1 end)::int`,
        priorityDo: sql4`count(case when ${tickets.priority} = 'do' then 1 end)::int`,
        priorityPlan: sql4`count(case when ${tickets.priority} = 'plan' then 1 end)::int`,
        priorityDelegate: sql4`count(case when ${tickets.priority} = 'delegate' then 1 end)::int`,
        priorityEliminate: sql4`count(case when ${tickets.priority} = 'eliminate' then 1 end)::int`,
        overdue: sql4`count(case when ${tickets.dueDate} < current_date and ${tickets.status} != 'done' then 1 end)::int`,
        dueToday: sql4`count(case when ${tickets.dueDate} = current_date then 1 end)::int`,
        dueThisWeek: sql4`count(case when ${tickets.dueDate} between current_date and current_date + interval '7 days' and ${tickets.status} != 'done' then 1 end)::int`,
        totalTimeEstimated: sql4`coalesce(sum(${tickets.timeEstimated}), 0)::int`,
        totalTimeSpent: sql4`coalesce(sum(${tickets.timeSpent}), 0)::int`
      }).from(tickets).where(and3(...conditions));
      const projectCount = project_id ? void 0 : await db.select({ count: sql4`count(*)::int` }).from(projects).where(eq4(projects.archived, false));
      const result = {
        ...stats,
        ...projectCount ? { projectCount: projectCount[0].count } : {}
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );
}

// src/tools/agile.ts
import { z as z6 } from "zod";
import { eq as eq5, and as and4, sql as sql5 } from "drizzle-orm";
function registerAgileTools(server2) {
  server2.tool(
    "list_epics",
    "Liste les epics avec progression (nombre de tickets par statut)",
    {
      project_id: z6.number().optional().describe("Filtrer par projet")
    },
    async ({ project_id }) => {
      const conditions = project_id ? [eq5(epics.projectId, project_id)] : [];
      const result = await db.select({
        id: epics.id,
        name: epics.name,
        description: epics.description,
        color: epics.color,
        status: epics.status,
        projectId: epics.projectId,
        createdAt: epics.createdAt,
        totalTickets: sql5`count(${tickets.id})::int`,
        doneTickets: sql5`count(case when ${tickets.status} = 'done' then 1 end)::int`
      }).from(epics).leftJoin(tickets, eq5(tickets.epicId, epics.id)).where(conditions.length > 0 ? and4(...conditions) : void 0).groupBy(epics.id).orderBy(epics.name);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );
  server2.tool(
    "list_milestones",
    "Liste les milestones avec progression",
    {
      project_id: z6.number().optional().describe("Filtrer par projet")
    },
    async ({ project_id }) => {
      const conditions = project_id ? [eq5(milestones.projectId, project_id)] : [];
      const result = await db.select({
        id: milestones.id,
        name: milestones.name,
        description: milestones.description,
        dueDate: milestones.dueDate,
        status: milestones.status,
        projectId: milestones.projectId,
        createdAt: milestones.createdAt,
        totalTickets: sql5`count(${tickets.id})::int`,
        doneTickets: sql5`count(case when ${tickets.status} = 'done' then 1 end)::int`
      }).from(milestones).leftJoin(tickets, eq5(tickets.milestoneId, milestones.id)).where(conditions.length > 0 ? and4(...conditions) : void 0).groupBy(milestones.id).orderBy(milestones.dueDate);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );
  server2.tool(
    "list_sprints",
    "Liste les sprints avec progression",
    {
      project_id: z6.number().optional().describe("Filtrer par projet")
    },
    async ({ project_id }) => {
      const conditions = project_id ? [eq5(sprints.projectId, project_id)] : [];
      const result = await db.select({
        id: sprints.id,
        name: sprints.name,
        goal: sprints.goal,
        startDate: sprints.startDate,
        endDate: sprints.endDate,
        status: sprints.status,
        projectId: sprints.projectId,
        createdAt: sprints.createdAt,
        totalTickets: sql5`count(${tickets.id})::int`,
        doneTickets: sql5`count(case when ${tickets.status} = 'done' then 1 end)::int`
      }).from(sprints).leftJoin(tickets, eq5(tickets.sprintId, sprints.id)).where(conditions.length > 0 ? and4(...conditions) : void 0).groupBy(sprints.id).orderBy(sprints.startDate);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );
}

// src/tools/activity.ts
import { z as z7 } from "zod";
import { eq as eq6, desc as desc2 } from "drizzle-orm";
function registerActivityTools(server2) {
  server2.tool(
    "get_activity",
    "Historique d'activite recent (global ou pour un ticket)",
    {
      ticket_id: z7.number().optional().describe("Filtrer par ticket"),
      limit: z7.number().optional().default(30).describe("Nombre max de resultats (defaut: 30)")
    },
    async ({ ticket_id, limit }) => {
      const query = db.select({
        id: activityLog.id,
        ticketId: activityLog.ticketId,
        ticketTitle: tickets.title,
        action: activityLog.action,
        field: activityLog.field,
        oldValue: activityLog.oldValue,
        newValue: activityLog.newValue,
        createdAt: activityLog.createdAt
      }).from(activityLog).leftJoin(tickets, eq6(activityLog.ticketId, tickets.id)).orderBy(desc2(activityLog.createdAt)).limit(limit || 30);
      if (ticket_id) {
        const result2 = await db.select({
          id: activityLog.id,
          ticketId: activityLog.ticketId,
          ticketTitle: tickets.title,
          action: activityLog.action,
          field: activityLog.field,
          oldValue: activityLog.oldValue,
          newValue: activityLog.newValue,
          createdAt: activityLog.createdAt
        }).from(activityLog).leftJoin(tickets, eq6(activityLog.ticketId, tickets.id)).where(eq6(activityLog.ticketId, ticket_id)).orderBy(desc2(activityLog.createdAt)).limit(limit || 30);
        return {
          content: [{ type: "text", text: JSON.stringify(result2, null, 2) }]
        };
      }
      const result = await query;
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );
}

// src/index.ts
var server = new McpServer({
  name: "taskflow",
  version: "1.0.0"
});
registerProjectTools(server);
registerTicketTools(server);
registerTaskTools(server);
registerCommentTools(server);
registerStatsTools(server);
registerAgileTools(server);
registerActivityTools(server);
var transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map