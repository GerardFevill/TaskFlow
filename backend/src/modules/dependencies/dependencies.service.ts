import { DependenciesRepository } from './dependencies.repository.js';

export class DependenciesService {
  constructor(private readonly repository: DependenciesRepository) {}

  async findByTicketId(ticketId: number) {
    return this.repository.findByTicketId(ticketId);
  }

  async create(ticketId: number, dependsOnId: number) {
    // Prevent self-dependency
    if (ticketId === dependsOnId) {
      throw new Error('A ticket cannot depend on itself');
    }
    return this.repository.create({ ticketId, dependsOnId });
  }

  async delete(ticketId: number, dependencyId: number) {
    return this.repository.deleteById(dependencyId);
  }
}
