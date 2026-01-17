import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/constants';
import { Epic } from '../models';

@Injectable({
  providedIn: 'root'
})
export class EpicService {
  private http = inject(HttpClient);

  getEpics(projectId?: number): Observable<Epic[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    return this.http.get<Epic[]>(`${API_URL}/epics${params}`);
  }

  getEpic(id: number): Observable<Epic> {
    return this.http.get<Epic>(`${API_URL}/epics/${id}`);
  }

  createEpic(epic: Partial<Epic>): Observable<Epic> {
    return this.http.post<Epic>(`${API_URL}/epics`, epic);
  }

  updateEpic(id: number, epic: Partial<Epic>): Observable<Epic> {
    return this.http.put<Epic>(`${API_URL}/epics/${id}`, epic);
  }

  deleteEpic(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/epics/${id}`);
  }
}
