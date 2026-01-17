import { Request, Response } from 'express';
import { StatsService } from './stats.service.js';

export class StatsController {
  constructor(private readonly service: StatsService) {}

  getGlobalStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.service.getGlobalStats();
    res.json(stats);
  };

  getProjectStats = async (req: Request, res: Response): Promise<void> => {
    const projectId = parseInt(req.params.id);
    const stats = await this.service.getProjectStats(projectId);
    res.json(stats);
  };
}
