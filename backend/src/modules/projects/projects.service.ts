import { ProjectsRepository } from './projects.repository.js';
import type { NewProject } from '../../db/schema/index.js';

export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  async findAll() {
    return this.repository.findAll();
  }

  async findById(id: number) {
    const project = await this.repository.findById(id);
    if (!project) return null;

    const stats = await this.repository.getStats(id);
    return { ...project, stats };
  }

  async getStats(projectId: number) {
    return this.repository.getStats(projectId);
  }

  async create(data: NewProject) {
    return this.repository.create({
      name: data.name,
      description: data.description || '',
      color: data.color || '#6c5ce7',
      icon: data.icon || 'fa-folder',
    });
  }

  async update(id: number, data: Partial<NewProject>) {
    return this.repository.update(id, data);
  }

  async delete(id: number) {
    // Cannot delete Inbox
    if (id === 1) {
      throw new Error('Cannot delete Inbox');
    }
    return this.repository.delete(id);
  }
}
