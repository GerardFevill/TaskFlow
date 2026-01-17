import { WhiteboardsRepository } from './whiteboards.repository.js';
import type { NewWhiteboard, NewWhiteboardElement } from '../../db/schema/index.js';

export class WhiteboardsService {
  constructor(private readonly repository: WhiteboardsRepository) {}

  async getOrCreateForProject(projectId: number) {
    let whiteboard = await this.repository.findByProjectId(projectId);
    if (!whiteboard) {
      whiteboard = await this.repository.create({
        projectId,
        name: 'Whiteboard',
      });
    }
    return whiteboard;
  }

  async findById(id: number) {
    return this.repository.findById(id);
  }

  async update(id: number, data: Partial<NewWhiteboard>) {
    return this.repository.update(id, data);
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }

  // Elements
  async getElements(boardId: number) {
    return this.repository.getElements(boardId);
  }

  async createElement(data: NewWhiteboardElement) {
    return this.repository.createElement(data);
  }

  async updateElement(id: number, data: Partial<NewWhiteboardElement>) {
    return this.repository.updateElement(id, data);
  }

  async deleteElement(id: number) {
    return this.repository.deleteElement(id);
  }

  async bulkCreateElements(elements: NewWhiteboardElement[]) {
    return this.repository.bulkCreateElements(elements);
  }

  async bulkDeleteElements(ids: number[]) {
    return this.repository.bulkDeleteElements(ids);
  }

  async reorderElements(boardId: number, elementIds: number[]) {
    await this.repository.reorderElements(boardId, elementIds);
    return this.repository.getElements(boardId);
  }

  async duplicateElement(id: number) {
    return this.repository.duplicateElement(id);
  }
}
