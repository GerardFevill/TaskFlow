import { Router } from 'express';
import { ImportExportController } from './import-export.controller.js';
import { ImportExportService } from './import-export.service.js';
import { asyncHandler } from '../../middleware/index.js';

const service = new ImportExportService();
const controller = new ImportExportController(service);

export const importExportRoutes = Router();

// GET /api/export - Export data
importExportRoutes.get('/', asyncHandler(controller.export));

// POST /api/import - Import data
importExportRoutes.post('/', asyncHandler(controller.import));
