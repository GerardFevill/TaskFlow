import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, Subject, tap } from 'rxjs';
import { API_URL, UPLOADS_URL } from '../../core/constants';
import {
  Project,
  Ticket,
  Label,
  Comment,
  Activity,
  Attachment,
  Stats,
  ProductivityData,
  DistributionData,
  GanttItem,
  Template,
  Dependency,
  AdvancedSearchParams,
  PaginatedResponse,
  TicketQueryParams,
  GlobalActivity
} from '../models';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private http = inject(HttpClient);
  private api = `${API_URL}/tickets`;
  private baseApi = API_URL;

  // Cache storage
  private labelsCache$?: Observable<Label[]>;
  private projectsCache$?: Observable<Project[]>;
  private invalidateCache$ = new Subject<void>();

  // Cache invalidation
  invalidateCache() {
    this.labelsCache$ = undefined;
    this.projectsCache$ = undefined;
    this.invalidateCache$.next();
  }

  // Projects (cached)
  getProjects() {
    if (!this.projectsCache$) {
      this.projectsCache$ = this.http.get<Project[]>(`${this.baseApi}/projects`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.projectsCache$;
  }

  // Force refresh projects
  refreshProjects() {
    this.projectsCache$ = undefined;
    return this.getProjects();
  }

  getProject(id: number) {
    return this.http.get<Project>(`${this.baseApi}/projects/${id}`);
  }

  createProject(name: string, color: string = '#6c5ce7', icon: string = 'fa-folder') {
    return this.http.post<Project>(`${this.baseApi}/projects`, { name, color, icon }).pipe(
      tap(() => this.projectsCache$ = undefined)
    );
  }

  updateProject(id: number, data: Partial<Project>) {
    return this.http.put<Project>(`${this.baseApi}/projects/${id}`, data).pipe(
      tap(() => this.projectsCache$ = undefined)
    );
  }

  deleteProject(id: number) {
    return this.http.delete(`${this.baseApi}/projects/${id}`).pipe(
      tap(() => this.projectsCache$ = undefined)
    );
  }

  // Tickets
  getAll(projectId?: number) {
    const url = projectId ? `${this.api}?project_id=${projectId}` : this.api;
    return this.http.get<PaginatedResponse<Ticket>>(url);
  }

  // Tickets with pagination and filters
  getTickets(params: TicketQueryParams = {}) {
    const queryParams = new URLSearchParams();
    if (params.project_id) queryParams.set('project_id', params.project_id.toString());
    if (params.status) queryParams.set('status', params.status);
    if (params.priority) queryParams.set('priority', params.priority);
    if (params.archived !== undefined) queryParams.set('archived', params.archived.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());

    const url = queryParams.toString() ? `${this.api}?${queryParams}` : this.api;
    return this.http.get<PaginatedResponse<Ticket>>(url);
  }

  getOne(id: number) {
    return this.http.get<Ticket>(`${this.api}/${id}`);
  }

  create(title: string, priority: string = 'do', projectId: number = 1) {
    return this.http.post<Ticket>(this.api, { title, priority, project_id: projectId });
  }

  update(id: number, data: Partial<Ticket>) {
    return this.http.put<Ticket>(`${this.api}/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }

  duplicate(id: number) {
    return this.http.post<Ticket>(`${this.api}/${id}/duplicate`, {});
  }

  // Export/Import
  export(format: 'json' | 'csv', projectId?: number) {
    let url = `${this.baseApi}/export?format=${format}`;
    if (projectId) {
      url += `&project_id=${projectId}`;
    }
    return this.http.get(url, {
      responseType: format === 'csv' ? 'text' as 'json' : 'json'
    });
  }

  import(tickets: any[]) {
    return this.http.post(`${this.baseApi}/import`, { tickets });
  }

  // Stats
  getStats() {
    return this.http.get<Stats>(`${this.baseApi}/stats`);
  }

  getProductivityStats(projectId?: number) {
    const url = projectId
      ? `${this.baseApi}/stats/productivity?project_id=${projectId}`
      : `${this.baseApi}/stats/productivity`;
    return this.http.get<ProductivityData[]>(url);
  }

  getDistributionStats(projectId?: number) {
    const url = projectId
      ? `${this.baseApi}/stats/distribution?project_id=${projectId}`
      : `${this.baseApi}/stats/distribution`;
    return this.http.get<DistributionData>(url);
  }

  // Search
  search(query: string) {
    return this.http.get<Ticket[]>(`${this.baseApi}/search?q=${encodeURIComponent(query)}`);
  }

  // Labels (cached)
  getLabels() {
    if (!this.labelsCache$) {
      this.labelsCache$ = this.http.get<Label[]>(`${this.baseApi}/labels`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.labelsCache$;
  }

  // Force refresh labels
  refreshLabels() {
    this.labelsCache$ = undefined;
    return this.getLabels();
  }

  createLabel(name: string, color: string) {
    return this.http.post<Label>(`${this.baseApi}/labels`, { name, color }).pipe(
      tap(() => this.labelsCache$ = undefined)
    );
  }

  deleteLabel(id: number) {
    return this.http.delete(`${this.baseApi}/labels/${id}`).pipe(
      tap(() => this.labelsCache$ = undefined)
    );
  }

  getTicketLabels(ticketId: number) {
    return this.http.get<Label[]>(`${this.api}/${ticketId}/labels`);
  }

  addLabelToTicket(ticketId: number, labelId: number) {
    return this.http.post(`${this.api}/${ticketId}/labels`, { label_id: labelId });
  }

  removeLabelFromTicket(ticketId: number, labelId: number) {
    return this.http.delete(`${this.api}/${ticketId}/labels/${labelId}`);
  }

  // Comments
  getComments(ticketId: number) {
    return this.http.get<Comment[]>(`${this.api}/${ticketId}/comments`);
  }

  addComment(text: string, ticketId: number) {
    return this.http.post<Comment>(`${this.baseApi}/comments`, { text, ticket_id: ticketId });
  }

  deleteComment(id: number) {
    return this.http.delete(`${this.baseApi}/comments/${id}`);
  }

  // Comment Reactions
  toggleReaction(commentId: number, emoji: string) {
    return this.http.post<{ action: string; emoji: string }>(`${this.baseApi}/comments/${commentId}/reactions`, { emoji });
  }

  // Activity
  getActivity(ticketId: number) {
    return this.http.get<Activity[]>(`${this.api}/${ticketId}/activity`);
  }

  // Attachments
  getAttachments(ticketId: number) {
    return this.http.get<Attachment[]>(`${this.api}/${ticketId}/attachments`);
  }

  uploadAttachment(ticketId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Attachment>(`${this.api}/${ticketId}/attachments`, formData);
  }

  deleteAttachment(id: number) {
    return this.http.delete(`${this.baseApi}/attachments/${id}`);
  }

  getAttachmentUrl(attachment: Attachment) {
    return `${UPLOADS_URL}/${attachment.filename}`;
  }

  // Time Tracking
  addTime(ticketId: number, minutes: number) {
    return this.http.post<Ticket>(`${this.api}/${ticketId}/time`, { minutes });
  }

  // Reminders
  getReminders() {
    return this.http.get<Ticket[]>(`${this.baseApi}/reminders`);
  }

  // Gantt
  getGanttData() {
    return this.http.get<GanttItem[]>(`${this.baseApi}/gantt`);
  }

  // Advanced Search
  advancedSearch(params: AdvancedSearchParams) {
    return this.http.post<Ticket[]>(`${this.baseApi}/search/advanced`, params);
  }

  // Pinned / Favorites
  togglePin(ticketId: number) {
    return this.http.put<Ticket>(`${this.api}/${ticketId}/pin`, {});
  }

  getPinnedTickets() {
    return this.http.get<Ticket[]>(`${this.api}/pinned`);
  }

  // Templates
  getTemplates() {
    return this.http.get<Template[]>(`${this.baseApi}/templates`);
  }

  createTemplate(template: { name: string, title: string, description?: string, priority: string, project_id?: number | null }) {
    return this.http.post<Template>(`${this.baseApi}/templates`, template);
  }

  saveAsTemplate(ticketId: number, name: string) {
    return this.http.post<Template>(`${this.api}/${ticketId}/save-template`, { name });
  }

  createFromTemplate(templateId: number, title: string, projectId: number) {
    return this.http.post<Ticket>(`${this.baseApi}/templates/${templateId}/create-ticket`, { title, project_id: projectId });
  }

  deleteTemplate(id: number) {
    return this.http.delete(`${this.baseApi}/templates/${id}`);
  }

  // Dependencies
  getDependencies(ticketId: number) {
    return this.http.get<{ blockedBy: Dependency[], blocks: Dependency[] }>(`${this.api}/${ticketId}/dependencies`);
  }

  addDependency(ticketId: number, dependsOnId: number) {
    return this.http.post(`${this.api}/${ticketId}/dependencies`, { depends_on_id: dependsOnId });
  }

  removeDependency(ticketId: number, dependsOnId: number) {
    return this.http.delete(`${this.api}/${ticketId}/dependencies/${dependsOnId}`);
  }

  // Task Reordering
  reorderTasks(ticketId: number, taskIds: number[]) {
    return this.http.put(`${this.api}/${ticketId}/tasks/reorder`, { taskIds });
  }

  // Global Activity
  getGlobalActivity(limit: number = 50) {
    return this.http.get<GlobalActivity[]>(`${this.baseApi}/activity?limit=${limit}`);
  }

  // Project Stats
  getProjectStats(projectId: number) {
    return this.http.get<Stats>(`${this.baseApi}/projects/${projectId}/stats`);
  }

  // Settings
  getSettings() {
    return this.http.get<Record<string, string>>(`${this.baseApi}/settings`);
  }

  updateSetting(key: string, value: string) {
    return this.http.put(`${this.baseApi}/settings/${key}`, { value });
  }

  // Auto-archive
  runAutoArchive() {
    return this.http.post<{ archived: number; message: string }>(`${this.baseApi}/auto-archive`, {});
  }

  // Transformations
  ticketToTask(ticketId: number, targetTicketId: number) {
    return this.http.post<any>(`${this.api}/${ticketId}/to-task`, { target_ticket_id: targetTicketId });
  }

  ticketToProject(ticketId: number) {
    return this.http.post<Project>(`${this.api}/${ticketId}/to-project`, {});
  }

  projectToTicket(projectId: number) {
    return this.http.post<Ticket>(`${this.baseApi}/projects/${projectId}/to-ticket`, {});
  }

  projectToTask(projectId: number, targetTicketId: number) {
    return this.http.post<any>(`${this.baseApi}/projects/${projectId}/to-task`, { target_ticket_id: targetTicketId });
  }
}
