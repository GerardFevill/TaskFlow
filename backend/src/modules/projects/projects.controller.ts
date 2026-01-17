import { Request, Response } from 'express';
import { ProjectsService } from './projects.service.js';

export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    const projects = await this.service.findAll();
    res.json(projects);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const project = await this.service.findById(id);
    if (!project) {
      res.status(404).json({ error: 'Projet non trouve' });
      return;
    }
    res.json(project);
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const stats = await this.service.getStats(id);
    res.json(stats);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, description, color, icon } = req.body;
    const project = await this.service.create({ name, description, color, icon });
    res.json(project);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const { name, description, color, icon, archived } = req.body;
    const project = await this.service.update(id, { name, description, color, icon, archived });
    if (!project) {
      res.status(404).json({ error: 'Projet non trouve' });
      return;
    }
    res.json(project);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    try {
      await this.service.delete(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };
}
