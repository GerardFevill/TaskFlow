import { eq, sql, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { epics, tickets, type Epic, type NewEpic } from '../../db/schema/index.js';

export class EpicsRepository {
  async findAll(projectId?: number) {
    const conditions = projectId ? [eq(epics.projectId, projectId)] : [];

    const result = await db
      .select({
        id: epics.id,
        name: epics.name,
        description: epics.description,
        color: epics.color,
        status: epics.status,
        projectId: epics.projectId,
        createdAt: epics.createdAt,
        ticketCount: sql<number>`(SELECT count(*) FROM tickets WHERE epic_id = ${epics.id})::int`,
        ticketDone: sql<number>`(SELECT count(*) FROM tickets WHERE epic_id = ${epics.id} AND status = 'done')::int`,
      })
      .from(epics)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(epics.createdAt);

    return result.map(e => ({
      ...e,
      project_id: e.projectId,
      created_at: e.createdAt,
      ticket_count: e.ticketCount,
      ticket_done: e.ticketDone,
      progress: e.ticketCount > 0 ? Math.round((e.ticketDone / e.ticketCount) * 100) : 0,
    }));
  }

  async findById(id: number): Promise<Epic | undefined> {
    const result = await db.select().from(epics).where(eq(epics.id, id));
    return result[0];
  }

  async create(data: NewEpic): Promise<Epic> {
    const result = await db.insert(epics).values(data).returning();
    return result[0];
  }

  async update(id: number, data: Partial<NewEpic>): Promise<Epic | undefined> {
    const result = await db.update(epics).set(data).where(eq(epics.id, id)).returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(epics).where(eq(epics.id, id)).returning();
    return result.length > 0;
  }
}
