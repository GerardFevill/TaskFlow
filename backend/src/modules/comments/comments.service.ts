import { CommentsRepository } from './comments.repository.js';
import type { NewComment } from '../../db/schema/index.js';

export class CommentsService {
  constructor(private readonly repository: CommentsRepository) {}

  async findByTicketId(ticketId: number) {
    return this.repository.findByTicketId(ticketId);
  }

  async create(data: NewComment) {
    return this.repository.create(data);
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }
}
