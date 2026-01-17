import { Request, Response } from 'express';
import { SprintsService } from './sprints.service.js';

export class SprintsController {
  constructor(private readonly service: SprintsService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const projectId = req.query.project_id ? parseInt(req.query.project_id as string) : undefined;
    const sprints = await this.service.findAll(projectId);
    res.json(sprints);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const sprint = await this.service.findById(id);
    if (!sprint) {
      res.status(404).json({ error: 'Sprint non trouve' });
      return;
    }
    res.json(sprint);
  };

  getTickets = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const tickets = await this.service.getTickets(id);
    res.json(tickets);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, goal, start_date, end_date, status, project_id } = req.body;
    const sprint = await this.service.create({
      name,
      goal,
      startDate: start_date,
      endDate: end_date,
      status,
      projectId: project_id,
    });
    res.json(sprint);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const { name, goal, start_date, end_date, status, project_id } = req.body;
    const sprint = await this.service.update(id, {
      name,
      goal,
      startDate: start_date,
      endDate: end_date,
      status,
      projectId: project_id,
    });
    if (!sprint) {
      res.status(404).json({ error: 'Sprint non trouve' });
      return;
    }
    res.json(sprint);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    await this.service.delete(id);
    res.json({ success: true });
  };

  getVelocity = async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const velocity = await this.service.getVelocity(limit);
    res.json(velocity);
  };

  getBurndown = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const burndown = await this.service.getBurndown(id);
    if (!burndown) {
      res.status(404).json({ error: 'Sprint non trouve' });
      return;
    }
    res.json(burndown);
  };
}
