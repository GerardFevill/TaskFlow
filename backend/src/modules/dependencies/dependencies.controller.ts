import { Request, Response } from 'express';
import { DependenciesService } from './dependencies.service.js';

export class DependenciesController {
  constructor(private readonly service: DependenciesService) {}

  getByTicketId = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const dependencies = await this.service.findByTicketId(ticketId);
    res.json(dependencies);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const { depends_on_id } = req.body;
    try {
      const dependency = await this.service.create(ticketId, depends_on_id);
      res.json(dependency);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const depId = parseInt(req.params.depId);
    await this.service.delete(ticketId, depId);
    res.json({ success: true });
  };
}
