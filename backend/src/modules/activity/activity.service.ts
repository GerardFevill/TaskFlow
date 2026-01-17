import { ActivityRepository } from './activity.repository.js';
import type { NewActivityLogEntry } from '../../db/schema/index.js';

export class ActivityService {
  constructor(private readonly repository: ActivityRepository) {}

  async findByTicketId(ticketId: number, limit = 50) {
    return this.repository.findByTicketId(ticketId, limit);
  }

  async findAll(limit = 50) {
    return this.repository.findAll(limit);
  }

  async log(data: NewActivityLogEntry) {
    return this.repository.create(data);
  }
}
