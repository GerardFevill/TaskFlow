import { eq, sql, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { milestones, tickets, type Milestone, type NewMilestone } from '../../db/schema/index.js';

export class MilestonesRepository {
  async findAll(projectId?: number) {
    const conditions = projectId ? [eq(milestones.projectId, projectId)] : [];

    const result = await db
      .select({
        id: milestones.id,
        name: milestones.name,
        description: milestones.description,
        dueDate: milestones.dueDate,
        status: milestones.status,
        projectId: milestones.projectId,
        createdAt: milestones.createdAt,
        ticketCount: sql<number>`(SELECT count(*) FROM tickets WHERE milestone_id = ${milestones.id})::int`,
        ticketDone: sql<number>`(SELECT count(*) FROM tickets WHERE milestone_id = ${milestones.id} AND status = 'done')::int`,
      })
      .from(milestones)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(milestones.dueDate);

    return result.map(m => ({
      ...m,
      due_date: m.dueDate,
      project_id: m.projectId,
      created_at: m.createdAt,
      ticket_count: m.ticketCount,
      ticket_done: m.ticketDone,
      progress: m.ticketCount > 0 ? Math.round((m.ticketDone / m.ticketCount) * 100) : 0,
    }));
  }

  async findById(id: number): Promise<Milestone | undefined> {
    const result = await db.select().from(milestones).where(eq(milestones.id, id));
    return result[0];
  }

  async create(data: NewMilestone): Promise<Milestone> {
    const result = await db.insert(milestones).values(data).returning();
    return result[0];
  }

  async update(id: number, data: Partial<NewMilestone>): Promise<Milestone | undefined> {
    const result = await db.update(milestones).set(data).where(eq(milestones.id, id)).returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(milestones).where(eq(milestones.id, id)).returning();
    return result.length > 0;
  }
}
