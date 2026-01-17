import { eq, sql, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { projects, tickets, type Project, type NewProject } from '../../db/schema/index.js';

export class ProjectsRepository {
  async findAll(): Promise<(Project & { ticketCount: number; ticketDone: number; ticketTodo: number; ticketInProgress: number })[]> {
    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        icon: projects.icon,
        archived: projects.archived,
        createdAt: projects.createdAt,
        ticketCount: sql<number>`count(${tickets.id})::int`,
        ticketDone: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
        ticketTodo: sql<number>`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
        ticketInProgress: sql<number>`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
      })
      .from(projects)
      .leftJoin(tickets, and(eq(tickets.projectId, projects.id), eq(tickets.archived, false)))
      .where(eq(projects.archived, false))
      .groupBy(projects.id)
      .orderBy(projects.id);

    return result.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      archived: row.archived,
      createdAt: row.createdAt,
      ticketCount: row.ticketCount || 0,
      ticketDone: row.ticketDone || 0,
      ticketTodo: row.ticketTodo || 0,
      ticketInProgress: row.ticketInProgress || 0,
    }));
  }

  async findById(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async getStats(projectId: number) {
    const result = await db
      .select({
        total: sql<number>`count(*)::int`,
        todo: sql<number>`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
        inProgress: sql<number>`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
        done: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
      })
      .from(tickets)
      .where(and(eq(tickets.projectId, projectId), eq(tickets.archived, false)));

    return result[0] || { total: 0, todo: 0, inProgress: 0, done: 0 };
  }

  async create(data: NewProject): Promise<Project> {
    const result = await db.insert(projects).values(data).returning();
    return result[0];
  }

  async update(id: number, data: Partial<NewProject>): Promise<Project | undefined> {
    const result = await db
      .update(projects)
      .set(data)
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    // Move tickets to Inbox (project 1)
    await db.update(tickets).set({ projectId: 1 }).where(eq(tickets.projectId, id));
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }
}
