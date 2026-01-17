import { Router } from 'express';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SettingsRepository } from './settings.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new SettingsRepository();
const service = new SettingsService(repository);
const controller = new SettingsController(service);

export const settingsRoutes = Router();

// GET /api/settings - Get all settings
settingsRoutes.get('/', asyncHandler(controller.getAll));

// PUT /api/settings/:key - Update a setting
settingsRoutes.put('/:key', asyncHandler(controller.update));

// POST /api/auto-archive - Run auto-archive
settingsRoutes.post('/auto-archive', asyncHandler(controller.runAutoArchive));
