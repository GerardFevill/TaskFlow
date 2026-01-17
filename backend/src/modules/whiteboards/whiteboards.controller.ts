import { Request, Response } from 'express';
import { WhiteboardsService } from './whiteboards.service.js';

export class WhiteboardsController {
  constructor(private readonly service: WhiteboardsService) {}

  getOrCreateForProject = async (req: Request, res: Response): Promise<void> => {
    const projectId = parseInt(req.params.projectId);
    const whiteboard = await this.service.getOrCreateForProject(projectId);
    res.json(whiteboard);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const whiteboard = await this.service.update(id, req.body);
    if (!whiteboard) {
      res.status(404).json({ error: 'Whiteboard non trouve' });
      return;
    }
    res.json(whiteboard);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    await this.service.delete(id);
    res.json({ success: true });
  };

  // Elements
  getElements = async (req: Request, res: Response): Promise<void> => {
    const boardId = parseInt(req.params.id);
    const elements = await this.service.getElements(boardId);
    res.json(elements);
  };

  createElement = async (req: Request, res: Response): Promise<void> => {
    const boardId = parseInt(req.params.id);
    const element = await this.service.createElement({ ...req.body, boardId });
    res.json(element);
  };

  updateElement = async (req: Request, res: Response): Promise<void> => {
    const elemId = parseInt(req.params.elemId);
    const element = await this.service.updateElement(elemId, req.body);
    if (!element) {
      res.status(404).json({ error: 'Element non trouve' });
      return;
    }
    res.json(element);
  };

  deleteElement = async (req: Request, res: Response): Promise<void> => {
    const elemId = parseInt(req.params.elemId);
    await this.service.deleteElement(elemId);
    res.json({ success: true });
  };

  bulkCreateElements = async (req: Request, res: Response): Promise<void> => {
    const boardId = parseInt(req.params.id);
    const elements = req.body.elements.map((e: any) => ({ ...e, boardId }));
    const created = await this.service.bulkCreateElements(elements);
    res.json(created);
  };

  bulkDeleteElements = async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body;
    const deleted = await this.service.bulkDeleteElements(ids);
    res.json({ deleted });
  };

  reorderElements = async (req: Request, res: Response): Promise<void> => {
    const boardId = parseInt(req.params.id);
    const { elementIds } = req.body;
    const elements = await this.service.reorderElements(boardId, elementIds);
    res.json(elements);
  };

  duplicateElement = async (req: Request, res: Response): Promise<void> => {
    const elemId = parseInt(req.params.elemId);
    const element = await this.service.duplicateElement(elemId);
    if (!element) {
      res.status(404).json({ error: 'Element non trouve' });
      return;
    }
    res.json(element);
  };
}
