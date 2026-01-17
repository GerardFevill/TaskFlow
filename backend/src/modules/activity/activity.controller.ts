import { Request, Response } from 'express';
import { ActivityService } from './activity.service.js';

export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  getByTicketId = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const activity = await this.service.findByTicketId(ticketId);
    res.json(activity);
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 50;
    const activity = await this.service.findAll(limit);
    res.json(activity);
  };
}
