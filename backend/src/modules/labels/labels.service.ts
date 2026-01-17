import { LabelsRepository } from './labels.repository.js';
import type { NewLabel } from '../../db/schema/index.js';

export class LabelsService {
  constructor(private readonly repository: LabelsRepository) {}

  async findAll() {
    return this.repository.findAll();
  }

  async create(data: NewLabel) {
    return this.repository.create({
      name: data.name,
      color: data.color || '#4ecdc4',
    });
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }

  async findByTicketId(ticketId: number) {
    return this.repository.findByTicketId(ticketId);
  }

  async addToTicket(ticketId: number, labelId: number) {
    await this.repository.addToTicket(ticketId, labelId);
    return this.repository.findByTicketId(ticketId);
  }

  async removeFromTicket(ticketId: number, labelId: number) {
    await this.repository.removeFromTicket(ticketId, labelId);
    return { success: true };
  }
}
