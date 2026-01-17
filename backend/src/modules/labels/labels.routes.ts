import { Router } from 'express';
import { LabelsController } from './labels.controller.js';
import { LabelsService } from './labels.service.js';
import { LabelsRepository } from './labels.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new LabelsRepository();
const service = new LabelsService(repository);
const controller = new LabelsController(service);

export const labelsRoutes = Router();

// GET /api/labels - Get all labels
labelsRoutes.get('/', asyncHandler(controller.getAll));

// POST /api/labels - Create a label
labelsRoutes.post('/', asyncHandler(controller.create));

// DELETE /api/labels/:id - Delete a label
labelsRoutes.delete('/:id', asyncHandler(controller.delete));
