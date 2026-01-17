import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../core/constants';
import { Task } from '../models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private api = `${API_URL}/tasks`;

  getAll() {
    return this.http.get<Task[]>(this.api);
  }

  getByTicket(ticketId: number) {
    return this.http.get<Task[]>(`${API_URL}/tickets/${ticketId}/tasks`);
  }

  create(text: string, ticketId: number) {
    return this.http.post<Task>(this.api, { text, ticket_id: ticketId });
  }

  update(id: number, data: Partial<Task>) {
    return this.http.put<Task>(`${this.api}/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }

  // Subtasks
  getSubtasks(taskId: number) {
    return this.http.get<Task[]>(`${this.api}/${taskId}/subtasks`);
  }

  createSubtask(text: string, parentId: number) {
    return this.http.post<Task>(`${this.api}/${parentId}/subtasks`, { text });
  }

  // Transformations
  taskToTicket(taskId: number) {
    return this.http.post<any>(`${this.api}/${taskId}/to-ticket`, {});
  }

  taskToProject(taskId: number) {
    return this.http.post<any>(`${this.api}/${taskId}/to-project`, {});
  }
}
