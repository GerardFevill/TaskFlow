import { Request, Response } from 'express';
import { SettingsService } from './settings.service.js';

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    const settings = await this.service.getAll();
    res.json(settings);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const { value } = req.body;

    const result = await this.service.update(key, value);
    if (!result) {
      res.status(400).json({ error: 'Invalid setting key' });
      return;
    }
    res.json(result);
  };

  runAutoArchive = async (_req: Request, res: Response): Promise<void> => {
    const count = await this.service.runAutoArchive();
    res.json({ archived: count });
  };
}
