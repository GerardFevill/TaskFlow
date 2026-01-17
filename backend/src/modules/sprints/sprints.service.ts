import { SprintsRepository } from './sprints.repository.js';
import type { NewSprint } from '../../db/schema/index.js';

export class SprintsService {
  constructor(private readonly repository: SprintsRepository) {}

  async findAll(projectId?: number) {
    return this.repository.findAll(projectId);
  }

  async findById(id: number) {
    return this.repository.findById(id);
  }

  async getTickets(sprintId: number) {
    return this.repository.getTickets(sprintId);
  }

  async create(data: NewSprint) {
    return this.repository.create(data);
  }

  async update(id: number, data: Partial<NewSprint>) {
    return this.repository.update(id, data);
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }

  async getVelocity(limit = 10) {
    return this.repository.getVelocity(limit);
  }

  async getBurndown(sprintId: number) {
    return this.repository.getBurndown(sprintId);
  }
}
