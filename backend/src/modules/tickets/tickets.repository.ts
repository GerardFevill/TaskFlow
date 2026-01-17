import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { tickets, tasks, projects, ticketLabels, labels, type Ticket, type NewTicket } from '../../db/schema/index.js';

export interface TicketQuery {
  projectId?: number;
  status?: string;
  priority?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
}

export class TicketsRepository {
  async findAll(query: TicketQuery) {
    const conditions = [];

    if (query.projectId) {
      conditions.push(eq(tickets.projectId, query.projectId));
    }
    if (query.status) {
      conditions.push(eq(tickets.status, query.status));
    }
    if (query.priority) {
      conditions.push(eq(tickets.priority, query.priority));
    }
    if (query.archived !== undefined) {
      conditions.push(eq(tickets.archived, query.archived));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
        description: tickets.description,
        dueDate: tickets.dueDate,
        startDate: tickets.startDate,
        position: tickets.position,
        archived: tickets.archived,
        pinned: tickets.pinned,
        recurrence: tickets.recurrence,
        reminderDays: tickets.reminderDays,
        timeEstimated: tickets.timeEstimated,
        timeSpent: tickets.timeSpent,
        projectId: tickets.projectId,
        epicId: tickets.epicId,
        milestoneId: tickets.milestoneId,
        sprintId: tickets.sprintId,
        createdAt: tickets.createdAt,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(tickets)
      .leftJoin(projects, eq(tickets.projectId, projects.id))
      .where(whereClause)
      .orderBy(desc(tickets.pinned), asc(tickets.position), asc(tickets.id))
      .limit(query.limit || 100)
      .offset(query.offset || 0);

    // Get task counts for each ticket
    const ticketIds = data.map(t => t.id);
    const taskCounts = ticketIds.length > 0 ? await db
      .select({
        ticketId: tasks.ticketId,
        taskCount: sql<number>`count(*)::int`,
        taskDone: sql<number>`count(case when ${tasks.done} then 1 end)::int`,
      })
      .from(tasks)
      .where(inArray(tasks.ticketId, ticketIds))
      .groupBy(tasks.ticketId) : [];

    const taskCountMap = new Map(taskCounts.map(tc => [tc.ticketId, tc]));

    // Get labels for each ticket
    const ticketLabelsData = ticketIds.length > 0 ? await db
      .select({
        ticketId: ticketLabels.ticketId,
        labelId: labels.id,
        labelName: labels.name,
        labelColor: labels.color,
      })
      .from(ticketLabels)
      .innerJoin(labels, eq(ticketLabels.labelId, labels.id))
      .where(inArray(ticketLabels.ticketId, ticketIds)) : [];

    const labelsMap = new Map<number, Array<{ id: number; name: string; color: string | null }>>();
    for (const tl of ticketLabelsData) {
      if (!labelsMap.has(tl.ticketId)) {
        labelsMap.set(tl.ticketId, []);
      }
      labelsMap.get(tl.ticketId)!.push({
        id: tl.labelId,
        name: tl.labelName,
        color: tl.labelColor,
      });
    }

    // Count total
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(whereClause);

    const formattedData = data.map(t => {
      const tc = taskCountMap.get(t.id);
      return {
        ...t,
        due_date: t.dueDate,
        start_date: t.startDate,
        reminder_days: t.reminderDays,
        time_estimated: t.timeEstimated,
        time_spent: t.timeSpent,
        project_id: t.projectId,
        epic_id: t.epicId,
        milestone_id: t.milestoneId,
        sprint_id: t.sprintId,
        created_at: t.createdAt,
        project_name: t.projectName,
        project_color: t.projectColor,
        task_count: tc?.taskCount || 0,
        task_done: tc?.taskDone || 0,
        labels: labelsMap.get(t.id) || [],
      };
    });

    return {
      data: formattedData,
      total: countResult[0]?.count || 0,
    };
  }

  async findById(id: number): Promise<Ticket | undefined> {
    const result = await db.select().from(tickets).where(eq(tickets.id, id));
    return result[0];
  }

  async findWithTasks(id: number) {
    const ticket = await this.findById(id);
    if (!ticket) return null;

    const ticketTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.ticketId, id))
      .orderBy(asc(tasks.position), asc(tasks.id));

    return { ...ticket, tasks: ticketTasks };
  }

  async findPinned() {
    return db
      .select()
      .from(tickets)
      .where(and(eq(tickets.pinned, true), eq(tickets.archived, false)))
      .orderBy(asc(tickets.position), asc(tickets.id));
  }

  async create(data: NewTicket & { searchVector?: any }): Promise<Ticket> {
    const result = await db
      .insert(tickets)
      .values({
        ...data,
        searchVector: sql`to_tsvector('french', ${data.title})`,
      })
      .returning();
    return result[0];
  }

  async update(id: number, data: Partial<NewTicket>): Promise<Ticket | undefined> {
    const updateData: any = { ...data };

    // Update search vector if title or description changed
    if (data.title || data.description) {
      const current = await this.findById(id);
      const newTitle = data.title || current?.title || '';
      const newDesc = data.description || current?.description || '';
      updateData.searchVector = sql`to_tsvector('french', ${newTitle} || ' ' || ${newDesc})`;
    }

    const result = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(tickets).where(eq(tickets.id, id)).returning();
    return result.length > 0;
  }

  async togglePin(id: number): Promise<Ticket | undefined> {
    const ticket = await this.findById(id);
    if (!ticket) return undefined;

    const result = await db
      .update(tickets)
      .set({ pinned: !ticket.pinned })
      .where(eq(tickets.id, id))
      .returning();
    return result[0];
  }

  async duplicate(id: number): Promise<Ticket | null> {
    const original = await this.findWithTasks(id);
    if (!original) return null;

    const newTicket = await this.create({
      title: `${original.title} (copie)`,
      status: original.status || 'todo',
      priority: original.priority || 'do',
      description: original.description,
      dueDate: original.dueDate,
      startDate: original.startDate,
      projectId: original.projectId,
      recurrence: original.recurrence,
      reminderDays: original.reminderDays,
      timeEstimated: original.timeEstimated,
    });

    // Duplicate tasks
    for (const task of original.tasks) {
      await db.insert(tasks).values({
        text: task.text,
        done: task.done,
        ticketId: newTicket.id,
        position: task.position,
      });
    }

    return newTicket;
  }

  async addTime(id: number, minutes: number): Promise<Ticket | undefined> {
    const ticket = await this.findById(id);
    if (!ticket) return undefined;

    const newTimeSpent = (ticket.timeSpent || 0) + minutes;
    const result = await db
      .update(tickets)
      .set({ timeSpent: newTimeSpent })
      .where(eq(tickets.id, id))
      .returning();
    return result[0];
  }
}
