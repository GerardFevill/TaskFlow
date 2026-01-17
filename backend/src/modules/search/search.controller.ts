import { Request, Response } from 'express';
import { SearchService } from './search.service.js';

export class SearchController {
  constructor(private readonly service: SearchService) {}

  simpleSearch = async (req: Request, res: Response): Promise<void> => {
    const query = req.query.q as string;
    const results = await this.service.simpleSearch(query);
    res.json(results);
  };

  advancedSearch = async (req: Request, res: Response): Promise<void> => {
    const { query, status, priority, labels, dateFrom, dateTo, projectId, pinned } = req.body;
    const results = await this.service.advancedSearch({
      query,
      status,
      priority,
      labels,
      dateFrom,
      dateTo,
      projectId,
      pinned,
    });
    res.json(results);
  };
}
