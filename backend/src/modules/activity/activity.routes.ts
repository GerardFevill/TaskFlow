import { Router } from 'express';
import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';
import { ActivityRepository } from './activity.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new ActivityRepository();
const service = new ActivityService(repository);
const controller = new ActivityController(service);

export const activityRoutes = Router();

// GET /api/activity - Get global activity
activityRoutes.get('/', asyncHandler(controller.getAll));
