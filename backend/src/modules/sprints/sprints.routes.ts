import { Router } from 'express';
import { SprintsController } from './sprints.controller.js';
import { SprintsService } from './sprints.service.js';
import { SprintsRepository } from './sprints.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new SprintsRepository();
const service = new SprintsService(repository);
const controller = new SprintsController(service);

export const sprintsRoutes = Router();

sprintsRoutes.get('/', asyncHandler(controller.getAll));
sprintsRoutes.get('/velocity', asyncHandler(controller.getVelocity));
sprintsRoutes.get('/:id', asyncHandler(controller.getById));
sprintsRoutes.get('/:id/tickets', asyncHandler(controller.getTickets));
sprintsRoutes.get('/:id/burndown', asyncHandler(controller.getBurndown));
sprintsRoutes.post('/', asyncHandler(controller.create));
sprintsRoutes.put('/:id', asyncHandler(controller.update));
sprintsRoutes.delete('/:id', asyncHandler(controller.delete));
