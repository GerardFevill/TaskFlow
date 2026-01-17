import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EpicService, TicketService } from '../../data/services';
import { Epic, Project } from '../../data/models';
import { ToastService } from '../../core/services';
import { ProgressRingComponent } from '../../shared/components/progress-ring.component';

@Component({
  selector: 'app-epics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProgressRingComponent],
  templateUrl: './epics.component.html',
  styleUrl: './epics.component.scss'
})
export class EpicsComponent implements OnInit {
  private epicService = inject(EpicService);
  private ticketService = inject(TicketService);
  private toast = inject(ToastService);

  epics = signal<Epic[]>([]);
  projects = signal<Project[]>([]);
  loading = signal(true);
  filterProjectId = signal<number | null>(null);
  filterStatus = signal<string | null>(null);
  editingEpic = signal<Epic | null>(null);
  addingTicketToEpic = signal<number | null>(null);
  newTicketTitle = '';

  newEpic = {
    name: '',
    color: '#6c5ce7',
    project_id: null as number | null
  };

  epicStatuses = [
    { value: null, label: 'Tous' },
    { value: 'open', label: 'Ouvert' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Termine' }
  ];

  filteredEpics = computed(() => {
    let result = this.epics();
    const status = this.filterStatus();
    const projectId = this.filterProjectId();

    if (status) {
      result = result.filter(e => e.status === status);
    }
    if (projectId) {
      result = result.filter(e => e.project_id === projectId);
    }
    return result;
  });

  ngOnInit() {
    this.loadProjects();
    this.loadEpics();
  }

  loadProjects() {
    this.ticketService.getProjects().subscribe({
      next: (projects) => this.projects.set(projects),
      error: () => this.toast.show('Erreur chargement projets', 'error')
    });
  }

  loadEpics() {
    this.loading.set(true);
    const projectId = this.filterProjectId() ?? undefined;
    this.epicService.getEpics(projectId).subscribe({
      next: (epics) => {
        this.epics.set(epics);
        this.loading.set(false);
      },
      error: () => {
        this.toast.show('Erreur chargement epics', 'error');
        this.loading.set(false);
      }
    });
  }

  createEpic() {
    if (!this.newEpic.name.trim()) return;

    this.epicService.createEpic({
      name: this.newEpic.name.trim(),
      color: this.newEpic.color,
      project_id: this.newEpic.project_id || undefined
    }).subscribe({
      next: (epic) => {
        this.epics.update(list => [epic, ...list]);
        this.newEpic.name = '';
        this.toast.show('Epic cree', 'success');
      },
      error: () => this.toast.show('Erreur creation epic', 'error')
    });
  }

  startEdit(epic: Epic) {
    this.editingEpic.set({ ...epic });
  }

  cancelEdit() {
    this.editingEpic.set(null);
  }

  saveEpic() {
    const epic = this.editingEpic();
    if (!epic) return;

    this.epicService.updateEpic(epic.id, {
      name: epic.name,
      description: epic.description,
      color: epic.color,
      status: epic.status
    }).subscribe({
      next: (updated) => {
        this.epics.update(list => list.map(e => e.id === updated.id ? updated : e));
        this.editingEpic.set(null);
        this.toast.show('Epic modifie', 'success');
      },
      error: () => this.toast.show('Erreur modification epic', 'error')
    });
  }

  deleteEpic(epic: Epic) {
    if (!confirm(`Supprimer l'epic "${epic.name}" ?`)) return;

    this.epicService.deleteEpic(epic.id).subscribe({
      next: () => {
        this.epics.update(list => list.filter(e => e.id !== epic.id));
        this.toast.show('Epic supprime', 'success');
      },
      error: () => this.toast.show('Erreur suppression epic', 'error')
    });
  }

  setFilterStatus(status: string | null) {
    this.filterStatus.set(status);
  }

  getStatusLabel(status: string): string {
    const found = this.epicStatuses.find(s => s.value === status);
    return found?.label || status;
  }

  startAddTicket(epic: Epic) {
    this.addingTicketToEpic.set(epic.id);
    this.newTicketTitle = '';
  }

  cancelAddTicket() {
    this.addingTicketToEpic.set(null);
    this.newTicketTitle = '';
  }

  createTicketForEpic(epic: Epic) {
    if (!this.newTicketTitle.trim()) return;

    this.ticketService.create(this.newTicketTitle.trim(), 'plan', epic.project_id || 1).subscribe({
      next: (ticket) => {
        // Update ticket with epic_id
        this.ticketService.update(ticket.id, { epic_id: epic.id }).subscribe({
          next: () => {
            this.toast.show('Ticket cree', 'success');
            this.cancelAddTicket();
            // Refresh epics to update counts
            this.loadEpics();
          },
          error: () => this.toast.show('Erreur association epic', 'error')
        });
      },
      error: () => this.toast.show('Erreur creation ticket', 'error')
    });
  }
}
