import { EpicsRepository } from './epics.repository.js';
import type { NewEpic } from '../../db/schema/index.js';

export class EpicsService {
  constructor(private readonly repository: EpicsRepository) {}

  async findAll(projectId?: number) {
    return this.repository.findAll(projectId);
  }

  async findById(id: number) {
    return this.repository.findById(id);
  }

  async create(data: NewEpic) {
    return this.repository.create(data);
  }

  async update(id: number, data: Partial<NewEpic>) {
    return this.repository.update(id, data);
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }
}
