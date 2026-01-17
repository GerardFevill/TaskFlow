import { Request, Response } from 'express';
import { ImportExportService } from './import-export.service.js';

export class ImportExportController {
  constructor(private readonly service: ImportExportService) {}

  export = async (req: Request, res: Response): Promise<void> => {
    const format = (req.query.format as 'json' | 'csv') || 'json';
    const projectId = req.query.project_id ? parseInt(req.query.project_id as string) : undefined;

    const result = await this.service.exportData(format, projectId);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
    res.send(result.data);
  };

  import = async (req: Request, res: Response): Promise<void> => {
    const data = req.body;
    if (!Array.isArray(data)) {
      res.status(400).json({ error: 'Data must be an array' });
      return;
    }

    const result = await this.service.importData(data);
    res.json(result);
  };
}
