import { db } from '../../db/index.js';
import { tickets, projects } from '../../db/schema/index.js';
import { eq, and, gte, lte, sql, ne } from 'drizzle-orm';

export class RemindersService {
  async getReminders() {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 30); // Next 30 days

    const result = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        dueDate: tickets.dueDate,
        reminderDays: tickets.reminderDays,
        status: tickets.status,
        priority: tickets.priority,
        projectId: tickets.projectId,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(tickets)
      .leftJoin(projects, eq(tickets.projectId, projects.id))
      .where(
        and(
          eq(tickets.archived, false),
          ne(tickets.status, 'done'),
          sql`${tickets.dueDate} IS NOT NULL`,
          gte(tickets.reminderDays, 0),
          lte(tickets.dueDate, futureDate.toISOString().split('T')[0])
        )
      )
      .orderBy(tickets.dueDate);

    return result.map(r => ({
      id: r.id,
      title: r.title,
      due_date: r.dueDate,
      reminder_days: r.reminderDays,
      status: r.status,
      priority: r.priority,
      project_id: r.projectId,
      project_name: r.projectName,
      project_color: r.projectColor,
    }));
  }

  async getGanttData() {
    const result = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        startDate: tickets.startDate,
        dueDate: tickets.dueDate,
        status: tickets.status,
        priority: tickets.priority,
        projectId: tickets.projectId,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(tickets)
      .leftJoin(projects, eq(tickets.projectId, projects.id))
      .where(
        and(
          eq(tickets.archived, false),
          sql`(${tickets.startDate} IS NOT NULL OR ${tickets.dueDate} IS NOT NULL)`
        )
      )
      .orderBy(tickets.startDate, tickets.dueDate);

    return result.map(r => ({
      id: r.id,
      title: r.title,
      start_date: r.startDate,
      due_date: r.dueDate,
      status: r.status,
      priority: r.priority,
      project_id: r.projectId,
      project_name: r.projectName,
      project_color: r.projectColor,
    }));
  }
}
