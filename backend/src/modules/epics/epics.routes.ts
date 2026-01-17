import { Router } from 'express';
import { EpicsController } from './epics.controller.js';
import { EpicsService } from './epics.service.js';
import { EpicsRepository } from './epics.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new EpicsRepository();
const service = new EpicsService(repository);
const controller = new EpicsController(service);

export const epicsRoutes = Router();

epicsRoutes.get('/', asyncHandler(controller.getAll));
epicsRoutes.get('/:id', asyncHandler(controller.getById));
epicsRoutes.post('/', asyncHandler(controller.create));
epicsRoutes.put('/:id', asyncHandler(controller.update));
epicsRoutes.delete('/:id', asyncHandler(controller.delete));
