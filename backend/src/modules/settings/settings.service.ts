import { SettingsRepository } from './settings.repository.js';
import { db } from '../../db/index.js';
import { tickets } from '../../db/schema/index.js';
import { eq, and, lte, sql } from 'drizzle-orm';

export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  async getAll() {
    const settingsList = await this.repository.findAll();
    const settingsMap: Record<string, string> = {};
    for (const s of settingsList) {
      settingsMap[s.key] = s.value;
    }
    return settingsMap;
  }

  async update(key: string, value: string) {
    const allowedKeys = ['auto_archive_enabled', 'auto_archive_days'];
    if (!allowedKeys.includes(key)) {
      return null;
    }
    return this.repository.update(key, value);
  }

  async runAutoArchive(): Promise<number> {
    const settingsMap = await this.getAll();
    const enabled = settingsMap['auto_archive_enabled'] === 'true';
    const days = parseInt(settingsMap['auto_archive_days'] || '7');

    if (!enabled) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .update(tickets)
      .set({ archived: true })
      .where(
        and(
          eq(tickets.status, 'done'),
          eq(tickets.archived, false),
          lte(tickets.createdAt, cutoffDate)
        )
      )
      .returning();

    return result.length;
  }
}
