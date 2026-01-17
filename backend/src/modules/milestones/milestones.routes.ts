import { Router } from 'express';
import { MilestonesController } from './milestones.controller.js';
import { MilestonesService } from './milestones.service.js';
import { MilestonesRepository } from './milestones.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new MilestonesRepository();
const service = new MilestonesService(repository);
const controller = new MilestonesController(service);

export const milestonesRoutes = Router();

milestonesRoutes.get('/', asyncHandler(controller.getAll));
milestonesRoutes.get('/:id', asyncHandler(controller.getById));
milestonesRoutes.post('/', asyncHandler(controller.create));
milestonesRoutes.put('/:id', asyncHandler(controller.update));
milestonesRoutes.delete('/:id', asyncHandler(controller.delete));
