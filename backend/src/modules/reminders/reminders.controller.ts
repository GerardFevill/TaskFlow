import { Request, Response } from 'express';
import { RemindersService } from './reminders.service.js';

export class RemindersController {
  constructor(private readonly service: RemindersService) {}

  getReminders = async (_req: Request, res: Response): Promise<void> => {
    const reminders = await this.service.getReminders();
    res.json(reminders);
  };

  getGanttData = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getGanttData();
    res.json(data);
  };
}
