import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { settings, type Setting } from '../../db/schema/index.js';

export class SettingsRepository {
  async findAll(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async findByKey(key: string): Promise<Setting | undefined> {
    const result = await db.select().from(settings).where(eq(settings.key, key));
    return result[0];
  }

  async update(key: string, value: string): Promise<Setting | undefined> {
    const result = await db
      .update(settings)
      .set({ value })
      .where(eq(settings.key, key))
      .returning();
    return result[0];
  }
}
