import { Router } from 'express';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';
import { StatsRepository } from './stats.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new StatsRepository();
const service = new StatsService(repository);
const controller = new StatsController(service);

export const statsRoutes = Router();

// GET /api/stats - Get global stats
statsRoutes.get('/', asyncHandler(controller.getGlobalStats));
