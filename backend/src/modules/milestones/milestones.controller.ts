import { Request, Response } from 'express';
import { MilestonesService } from './milestones.service.js';

export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const projectId = req.query.project_id ? parseInt(req.query.project_id as string) : undefined;
    const milestones = await this.service.findAll(projectId);
    res.json(milestones);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const milestone = await this.service.findById(id);
    if (!milestone) {
      res.status(404).json({ error: 'Milestone non trouve' });
      return;
    }
    res.json(milestone);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, description, due_date, status, project_id } = req.body;
    const milestone = await this.service.create({
      name,
      description,
      dueDate: due_date,
      status,
      projectId: project_id,
    });
    res.json(milestone);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const { name, description, due_date, status, project_id } = req.body;
    const milestone = await this.service.update(id, {
      name,
      description,
      dueDate: due_date,
      status,
      projectId: project_id,
    });
    if (!milestone) {
      res.status(404).json({ error: 'Milestone non trouve' });
      return;
    }
    res.json(milestone);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    await this.service.delete(id);
    res.json({ success: true });
  };
}
