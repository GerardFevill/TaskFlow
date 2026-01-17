import { Router } from 'express';
import { RemindersController } from './reminders.controller.js';
import { RemindersService } from './reminders.service.js';
import { asyncHandler } from '../../middleware/index.js';

const service = new RemindersService();
const controller = new RemindersController(service);

export const remindersRoutes = Router();

// GET /api/reminders - Get reminders
remindersRoutes.get('/', asyncHandler(controller.getReminders));

// GET /api/gantt - Get gantt data
remindersRoutes.get('/gantt', asyncHandler(controller.getGanttData));
