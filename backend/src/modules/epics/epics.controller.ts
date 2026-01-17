import { Request, Response } from 'express';
import { EpicsService } from './epics.service.js';

export class EpicsController {
  constructor(private readonly service: EpicsService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const projectId = req.query.project_id ? parseInt(req.query.project_id as string) : undefined;
    const epics = await this.service.findAll(projectId);
    res.json(epics);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const epic = await this.service.findById(id);
    if (!epic) {
      res.status(404).json({ error: 'Epic non trouve' });
      return;
    }
    res.json(epic);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, description, color, status, project_id } = req.body;
    const epic = await this.service.create({
      name,
      description,
      color,
      status,
      projectId: project_id,
    });
    res.json(epic);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const { name, description, color, status, project_id } = req.body;
    const epic = await this.service.update(id, {
      name,
      description,
      color,
      status,
      projectId: project_id,
    });
    if (!epic) {
      res.status(404).json({ error: 'Epic non trouve' });
      return;
    }
    res.json(epic);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    await this.service.delete(id);
    res.json({ success: true });
  };
}
