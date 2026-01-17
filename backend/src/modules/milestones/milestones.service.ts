import { MilestonesRepository } from './milestones.repository.js';
import type { NewMilestone } from '../../db/schema/index.js';

export class MilestonesService {
  constructor(private readonly repository: MilestonesRepository) {}

  async findAll(projectId?: number) {
    return this.repository.findAll(projectId);
  }

  async findById(id: number) {
    return this.repository.findById(id);
  }

  async create(data: NewMilestone) {
    return this.repository.create(data);
  }

  async update(id: number, data: Partial<NewMilestone>) {
    return this.repository.update(id, data);
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }
}
