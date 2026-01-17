import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SprintService, TicketService } from '../../data/services';
import { Sprint, Project } from '../../data/models';
import { ToastService } from '../../core/services';
import { ProgressRingComponent } from '../../shared/components/progress-ring.component';
import { BurndownChartComponent } from './burndown-chart.component';
import { VelocityChartComponent } from './velocity-chart.component';

@Component({
  selector: 'app-sprints',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProgressRingComponent, BurndownChartComponent, VelocityChartComponent],
  templateUrl: './sprints.component.html',
  styleUrl: './sprints.component.scss'
})
export class SprintsComponent implements OnInit {
  private sprintService = inject(SprintService);
  private ticketService = inject(TicketService);
  private toast = inject(ToastService);

  sprints = signal<Sprint[]>([]);
  projects = signal<Project[]>([]);
  loading = signal(true);
  filterProjectId = signal<number | null>(null);
  filterStatus = signal<string | null>(null);
  editingSprint = signal<Sprint | null>(null);
  addingTicketToSprint = signal<number | null>(null);
  newTicketTitle = '';

  newSprint = {
    name: '',
    start_date: '',
    end_date: '',
    project_id: null as number | null
  };

  sprintStatuses = [
    { value: null, label: 'Tous', icon: 'fa-list' },
    { value: 'planning', label: 'Planification', icon: 'fa-clipboard-list' },
    { value: 'active', label: 'Actif', icon: 'fa-bolt' },
    { value: 'completed', label: 'Termine', icon: 'fa-trophy' }
  ];

  filteredSprints = computed(() => {
    let result = this.sprints();
    const status = this.filterStatus();
    const projectId = this.filterProjectId();

    if (status) {
      result = result.filter(s => s.status === status);
    }
    if (projectId) {
      result = result.filter(s => s.project_id === projectId);
    }
    return result;
  });

  activeSprint = computed(() => {
    const status = this.filterStatus();
    const projectId = this.filterProjectId();
    if (status && status !== 'active') return null;

    let result = this.sprints().filter(s => s.status === 'active');
    if (projectId) {
      result = result.filter(s => s.project_id === projectId);
    }
    return result[0] || null;
  });

  planningSprints = computed(() => {
    const status = this.filterStatus();
    const projectId = this.filterProjectId();
    if (status && status !== 'planning') return [];

    let result = this.sprints().filter(s => s.status === 'planning');
    if (projectId) {
      result = result.filter(s => s.project_id === projectId);
    }
    return result;
  });

  completedSprints = computed(() => {
    const status = this.filterStatus();
    const projectId = this.filterProjectId();
    if (status && status !== 'completed') return [];

    let result = this.sprints().filter(s => s.status === 'completed');
    if (projectId) {
      result = result.filter(s => s.project_id === projectId);
    }
    return result.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
  });

  ngOnInit() {
    this.loadProjects();
    this.loadSprints();
    this.setDefaultDates();
  }

  setDefaultDates() {
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14);

    this.newSprint.start_date = today.toISOString().split('T')[0];
    this.newSprint.end_date = twoWeeksLater.toISOString().split('T')[0];
  }

  loadProjects() {
    this.ticketService.getProjects().subscribe({
      next: (projects) => this.projects.set(projects),
      error: () => this.toast.show('Erreur chargement projets', 'error')
    });
  }

  loadSprints() {
    this.loading.set(true);
    const projectId = this.filterProjectId() ?? undefined;
    this.sprintService.getSprints(projectId).subscribe({
      next: (sprints) => {
        this.sprints.set(sprints);
        this.loading.set(false);
      },
      error: () => {
        this.toast.show('Erreur chargement sprints', 'error');
        this.loading.set(false);
      }
    });
  }

  createSprint() {
    if (!this.newSprint.name.trim() || !this.newSprint.start_date || !this.newSprint.end_date) return;

    this.sprintService.createSprint({
      name: this.newSprint.name.trim(),
      start_date: this.newSprint.start_date,
      end_date: this.newSprint.end_date,
      project_id: this.newSprint.project_id || undefined
    }).subscribe({
      next: (sprint) => {
        this.sprints.update(list => [sprint, ...list]);
        this.newSprint.name = '';
        this.setDefaultDates();
        this.toast.show('Sprint cree', 'success');
      },
      error: () => this.toast.show('Erreur creation sprint', 'error')
    });
  }

  startEdit(sprint: Sprint) {
    this.editingSprint.set({ ...sprint });
  }

  cancelEdit() {
    this.editingSprint.set(null);
  }

  saveSprint() {
    const sprint = this.editingSprint();
    if (!sprint) return;

    this.sprintService.updateSprint(sprint.id, {
      name: sprint.name,
      goal: sprint.goal,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      status: sprint.status
    }).subscribe({
      next: (updated) => {
        this.sprints.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.editingSprint.set(null);
        this.toast.show('Sprint modifie', 'success');
      },
      error: () => this.toast.show('Erreur modification sprint', 'error')
    });
  }

  startSprint(sprint: Sprint) {
    // Check if there's already an active sprint
    const activeSprint = this.sprints().find(s => s.status === 'active');
    if (activeSprint) {
      if (!confirm(`Le sprint "${activeSprint.name}" est deja actif. Voulez-vous le terminer et demarrer "${sprint.name}" ?`)) {
        return;
      }
      // Complete the active sprint first
      this.sprintService.updateSprint(activeSprint.id, { status: 'completed' }).subscribe();
    }

    this.sprintService.updateSprint(sprint.id, { status: 'active' }).subscribe({
      next: (updated) => {
        this.sprints.update(list => list.map(s => {
          if (s.id === updated.id) return updated;
          if (s.status === 'active') return { ...s, status: 'completed' as const };
          return s;
        }));
        this.toast.show('Sprint demarre', 'success');
      },
      error: () => this.toast.show('Erreur demarrage sprint', 'error')
    });
  }

  completeSprint(sprint: Sprint) {
    if (!confirm(`Terminer le sprint "${sprint.name}" ?`)) return;

    this.sprintService.updateSprint(sprint.id, { status: 'completed' }).subscribe({
      next: (updated) => {
        this.sprints.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.toast.show('Sprint termine', 'success');
      },
      error: () => this.toast.show('Erreur terminaison sprint', 'error')
    });
  }

  deleteSprint(sprint: Sprint) {
    if (!confirm(`Supprimer le sprint "${sprint.name}" ?`)) return;

    this.sprintService.deleteSprint(sprint.id).subscribe({
      next: () => {
        this.sprints.update(list => list.filter(s => s.id !== sprint.id));
        this.toast.show('Sprint supprime', 'success');
      },
      error: () => this.toast.show('Erreur suppression sprint', 'error')
    });
  }

  setFilterStatus(status: string | null) {
    this.filterStatus.set(status);
  }

  getStatusLabel(status: string): string {
    const found = this.sprintStatuses.find(s => s.value === status);
    return found?.label || status;
  }

  getDaysRemaining(sprint: Sprint): number {
    const diff = new Date(sprint.end_date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getSprintProgress(sprint: Sprint): number {
    const start = new Date(sprint.start_date).getTime();
    const end = new Date(sprint.end_date).getTime();
    const now = new Date().getTime();

    if (now <= start) return 0;
    if (now >= end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  }

  isEndingSoon(sprint: Sprint): boolean {
    return this.getDaysRemaining(sprint) <= 3;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  startAddTicket(sprint: Sprint) {
    this.addingTicketToSprint.set(sprint.id);
    this.newTicketTitle = '';
  }

  cancelAddTicket() {
    this.addingTicketToSprint.set(null);
    this.newTicketTitle = '';
  }

  createTicketForSprint(sprint: Sprint) {
    if (!this.newTicketTitle.trim()) return;

    this.ticketService.create(this.newTicketTitle.trim(), 'plan', sprint.project_id || 1).subscribe({
      next: (ticket) => {
        this.ticketService.update(ticket.id, { sprint_id: sprint.id }).subscribe({
          next: () => {
            this.toast.show('Ticket cree', 'success');
            this.cancelAddTicket();
            this.loadSprints();
          },
          error: () => this.toast.show('Erreur association sprint', 'error')
        });
      },
      error: () => this.toast.show('Erreur creation ticket', 'error')
    });
  }
}
