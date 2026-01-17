import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/constants';
import { Whiteboard, WhiteboardElement } from '../models/whiteboard.model';

@Injectable({ providedIn: 'root' })
export class WhiteboardService {
  private http = inject(HttpClient);
  private baseApi = API_URL;

  // Get whiteboard for a project (auto-creates if none)
  getProjectWhiteboard(projectId: number): Observable<Whiteboard> {
    return this.http.get<Whiteboard>(`${this.baseApi}/projects/${projectId}/whiteboard`);
  }

  // Update whiteboard settings
  updateWhiteboard(id: number, data: Partial<Whiteboard>): Observable<Whiteboard> {
    return this.http.put<Whiteboard>(`${this.baseApi}/whiteboards/${id}`, data);
  }

  // Delete whiteboard
  deleteWhiteboard(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseApi}/whiteboards/${id}`);
  }

  // Get all elements for a whiteboard
  getElements(boardId: number): Observable<WhiteboardElement[]> {
    return this.http.get<WhiteboardElement[]>(`${this.baseApi}/whiteboards/${boardId}/elements`);
  }

  // Create a new element
  createElement(boardId: number, element: Partial<WhiteboardElement>): Observable<WhiteboardElement> {
    return this.http.post<WhiteboardElement>(`${this.baseApi}/whiteboards/${boardId}/elements`, element);
  }

  // Update an element
  updateElement(boardId: number, elementId: number, data: Partial<WhiteboardElement>): Observable<WhiteboardElement> {
    return this.http.put<WhiteboardElement>(`${this.baseApi}/whiteboards/${boardId}/elements/${elementId}`, data);
  }

  // Delete an element
  deleteElement(boardId: number, elementId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseApi}/whiteboards/${boardId}/elements/${elementId}`);
  }

  // Bulk create/update elements
  bulkUpdateElements(boardId: number, elements: Partial<WhiteboardElement>[]): Observable<WhiteboardElement[]> {
    return this.http.post<WhiteboardElement[]>(`${this.baseApi}/whiteboards/${boardId}/elements/bulk`, { elements });
  }

  // Bulk delete elements
  bulkDeleteElements(boardId: number, ids: number[]): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseApi}/whiteboards/${boardId}/elements/bulk`, { body: { ids } });
  }

  // Reorder elements (z-index)
  reorderElements(boardId: number, elementIds: number[]): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseApi}/whiteboards/${boardId}/elements/reorder`, { elementIds });
  }

  // Duplicate an element
  duplicateElement(boardId: number, elementId: number): Observable<WhiteboardElement> {
    return this.http.post<WhiteboardElement>(`${this.baseApi}/whiteboards/${boardId}/duplicate/${elementId}`, {});
  }

  // Upload image to whiteboard
  uploadImage(boardId: number, file: File): Observable<WhiteboardElement> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<WhiteboardElement>(`${this.baseApi}/whiteboards/${boardId}/images`, formData);
  }
}
