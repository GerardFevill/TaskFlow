import { eq, asc, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { tasks, type Task, type NewTask } from '../../db/schema/index.js';

export class TasksRepository {
  async findAll(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(asc(tasks.position), asc(tasks.id));
  }

  async findById(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async findByTicketId(ticketId: number): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.ticketId, ticketId))
      .orderBy(asc(tasks.position), asc(tasks.id));
  }

  async findSubtasks(parentId: number): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.parentId, parentId))
      .orderBy(asc(tasks.position), asc(tasks.id));
  }

  async create(data: NewTask): Promise<Task> {
    const result = await db.insert(tasks).values(data).returning();
    return result[0];
  }

  async update(id: number, data: Partial<NewTask>): Promise<Task | undefined> {
    const result = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  async reorder(ticketId: number, taskIds: number[]): Promise<void> {
    for (let i = 0; i < taskIds.length; i++) {
      await db
        .update(tasks)
        .set({ position: i })
        .where(and(eq(tasks.id, taskIds[i]), eq(tasks.ticketId, ticketId)));
    }
  }

  async getMaxPosition(ticketId: number): Promise<number> {
    const result = await db
      .select({ maxPos: tasks.position })
      .from(tasks)
      .where(eq(tasks.ticketId, ticketId))
      .orderBy(asc(tasks.position));

    if (result.length === 0) return 0;
    return (result[result.length - 1].maxPos || 0) + 1;
  }
}
