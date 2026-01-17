import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/constants';
import { Sprint, Ticket } from '../models';

export interface BurndownData {
  sprint: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  totalTickets: number;
  days: string[];
  ideal: number[];
  actual: number[];
}

export interface VelocityData {
  sprints: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    ticket_count: number;
    ticket_done: number;
    velocity: number;
  }[];
  averageVelocity: number;
  totalSprints: number;
}

@Injectable({
  providedIn: 'root'
})
export class SprintService {
  private http = inject(HttpClient);

  getSprints(projectId?: number): Observable<Sprint[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    return this.http.get<Sprint[]>(`${API_URL}/sprints${params}`);
  }

  getSprint(id: number): Observable<Sprint> {
    return this.http.get<Sprint>(`${API_URL}/sprints/${id}`);
  }

  getSprintTickets(id: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${API_URL}/sprints/${id}/tickets`);
  }

  createSprint(sprint: Partial<Sprint>): Observable<Sprint> {
    return this.http.post<Sprint>(`${API_URL}/sprints`, sprint);
  }

  updateSprint(id: number, sprint: Partial<Sprint>): Observable<Sprint> {
    return this.http.put<Sprint>(`${API_URL}/sprints/${id}`, sprint);
  }

  deleteSprint(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/sprints/${id}`);
  }

  getBurndown(sprintId: number): Observable<BurndownData> {
    return this.http.get<BurndownData>(`${API_URL}/sprints/${sprintId}/burndown`);
  }

  getVelocity(projectId?: number, limit?: number): Observable<VelocityData> {
    const params = new URLSearchParams();
    if (projectId) params.set('project_id', projectId.toString());
    if (limit) params.set('limit', limit.toString());
    const queryString = params.toString();
    return this.http.get<VelocityData>(`${API_URL}/sprints/velocity${queryString ? '?' + queryString : ''}`);
  }
}
