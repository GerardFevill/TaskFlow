import { Router } from 'express';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { asyncHandler } from '../../middleware/index.js';

const service = new SearchService();
const controller = new SearchController(service);

export const searchRoutes = Router();

// GET /api/search?q=term - Simple search
searchRoutes.get('/', asyncHandler(controller.simpleSearch));

// POST /api/search/advanced - Advanced search
searchRoutes.post('/advanced', asyncHandler(controller.advancedSearch));
