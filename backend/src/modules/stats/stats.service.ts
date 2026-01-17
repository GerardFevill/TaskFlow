import { StatsRepository } from './stats.repository.js';

export class StatsService {
  constructor(private readonly repository: StatsRepository) {}

  async getGlobalStats() {
    return this.repository.getGlobalStats();
  }

  async getProjectStats(projectId: number) {
    return this.repository.getProjectStats(projectId);
  }
}
