import { eq, sql, and, ne, desc, asc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { sprints, tickets, type Sprint, type NewSprint } from '../../db/schema/index.js';

export class SprintsRepository {
  async findAll(projectId?: number) {
    const conditions = projectId ? [eq(sprints.projectId, projectId)] : [];

    const result = await db
      .select({
        id: sprints.id,
        name: sprints.name,
        goal: sprints.goal,
        startDate: sprints.startDate,
        endDate: sprints.endDate,
        status: sprints.status,
        projectId: sprints.projectId,
        createdAt: sprints.createdAt,
        ticketCount: sql<number>`(SELECT count(*) FROM tickets WHERE sprint_id = ${sprints.id})::int`,
        ticketDone: sql<number>`(SELECT count(*) FROM tickets WHERE sprint_id = ${sprints.id} AND status = 'done')::int`,
      })
      .from(sprints)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sprints.startDate));

    return result.map(s => ({
      ...s,
      start_date: s.startDate,
      end_date: s.endDate,
      project_id: s.projectId,
      created_at: s.createdAt,
      ticket_count: s.ticketCount,
      ticket_done: s.ticketDone,
      progress: s.ticketCount > 0 ? Math.round((s.ticketDone / s.ticketCount) * 100) : 0,
    }));
  }

  async findById(id: number): Promise<Sprint | undefined> {
    const result = await db.select().from(sprints).where(eq(sprints.id, id));
    return result[0];
  }

  async getTickets(sprintId: number) {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.sprintId, sprintId))
      .orderBy(asc(tickets.position), asc(tickets.id));
  }

  async create(data: NewSprint): Promise<Sprint> {
    const result = await db.insert(sprints).values(data).returning();
    return result[0];
  }

  async update(id: number, data: Partial<NewSprint>): Promise<Sprint | undefined> {
    // If activating a sprint, deactivate others in the same project
    if (data.status === 'active') {
      const sprint = await this.findById(id);
      if (sprint && sprint.projectId) {
        await db
          .update(sprints)
          .set({ status: 'planning' })
          .where(
            and(
              eq(sprints.projectId, sprint.projectId),
              eq(sprints.status, 'active'),
              ne(sprints.id, id)
            )
          );
      }
    }

    const result = await db.update(sprints).set(data).where(eq(sprints.id, id)).returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(sprints).where(eq(sprints.id, id)).returning();
    return result.length > 0;
  }

  async getVelocity(limit = 10) {
    const completedSprints = await db
      .select({
        id: sprints.id,
        name: sprints.name,
        ticketDone: sql<number>`(SELECT count(*) FROM tickets WHERE sprint_id = ${sprints.id} AND status = 'done')::int`,
      })
      .from(sprints)
      .where(eq(sprints.status, 'completed'))
      .orderBy(desc(sprints.endDate))
      .limit(limit);

    return completedSprints.map(s => ({
      sprint_id: s.id,
      sprint_name: s.name,
      velocity: s.ticketDone,
    }));
  }

  async getBurndown(sprintId: number) {
    const sprint = await this.findById(sprintId);
    if (!sprint) return null;

    const sprintTickets = await this.getTickets(sprintId);
    const totalTickets = sprintTickets.length;

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const days: string[] = [];
    const ideal: number[] = [];
    const actual: number[] = [];

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      days.push(currentDate.toISOString().split('T')[0]);

      // Ideal burndown (linear)
      ideal.push(Math.round(totalTickets * (1 - i / (totalDays - 1))));

      // For actual, we'd need to track completion dates
      // Simplified: show remaining tickets as of now
      const now = new Date();
      if (currentDate <= now) {
        const doneCount = sprintTickets.filter(t => t.status === 'done').length;
        actual.push(totalTickets - doneCount);
      }
    }

    return { days, ideal, actual };
  }
}
