import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/constants';
import { Milestone } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MilestoneService {
  private http = inject(HttpClient);

  getMilestones(projectId?: number): Observable<Milestone[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    return this.http.get<Milestone[]>(`${API_URL}/milestones${params}`);
  }

  getMilestone(id: number): Observable<Milestone> {
    return this.http.get<Milestone>(`${API_URL}/milestones/${id}`);
  }

  createMilestone(milestone: Partial<Milestone>): Observable<Milestone> {
    return this.http.post<Milestone>(`${API_URL}/milestones`, milestone);
  }

  updateMilestone(id: number, milestone: Partial<Milestone>): Observable<Milestone> {
    return this.http.put<Milestone>(`${API_URL}/milestones/${id}`, milestone);
  }

  deleteMilestone(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/milestones/${id}`);
  }
}
