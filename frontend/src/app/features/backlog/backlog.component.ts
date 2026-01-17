import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TicketService, EpicService, MilestoneService, SprintService } from '../../data/services';
import { Ticket, Project } from '../../data/models';
import { Epic, Milestone, Sprint } from '../../data/models';
import { ToastService } from '../../core/services';

type BacklogView = 'all' | 'project' | 'sprint' | 'epic' | 'milestone';

@Component({
  selector: 'app-backlog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './backlog.component.html',
  styleUrl: './backlog.component.scss'
})
export class BacklogComponent implements OnInit {
  private ticketService = inject(TicketService);
  private epicService = inject(EpicService);
  private milestoneService = inject(MilestoneService);
  private sprintService = inject(SprintService);
  private toast = inject(ToastService);

  tickets = signal<Ticket[]>([]);
  projects = signal<Project[]>([]);
  epics = signal<Epic[]>([]);
  milestones = signal<Milestone[]>([]);
  sprints = signal<Sprint[]>([]);
  loading = signal(true);

  currentView = signal<BacklogView>('all');
  expandedProjects = signal<Set<number>>(new Set([1])); // Expand first project by default

  // Computed: All unassigned tickets (no sprint, no epic, no milestone)
  allUnassignedTickets = computed(() => {
    return this.tickets().filter(t =>
      !t.archived &&
      !t.sprint_id &&
      !t.epic_id &&
      !t.milestone_id
    );
  });

  // Computed: Tickets without sprint
  ticketsWithoutSprint = computed(() => {
    return this.tickets().filter(t => !t.archived && !t.sprint_id);
  });

  // Computed: Tickets without epic
  ticketsWithoutEpic = computed(() => {
    return this.tickets().filter(t => !t.archived && !t.epic_id);
  });

  // Computed: Tickets without milestone
  ticketsWithoutMilestone = computed(() => {
    return this.tickets().filter(t => !t.archived && !t.milestone_id);
  });

  // Computed: Active/planning sprints
  activeSprints = computed(() => {
    return this.sprints().filter(s => s.status === 'active' || s.status === 'planning');
  });

  // Computed: Open epics
  openEpics = computed(() => {
    return this.epics().filter(e => e.status !== 'completed');
  });

  // Computed: Open milestones
  openMilestones = computed(() => {
    return this.milestones().filter(m => m.status === 'open');
  });

  ngOnInit() {
    this.loadTickets();
    this.loadProjects();
    this.loadEpics();
    this.loadMilestones();
    this.loadSprints();
  }

  loadTickets() {
    this.loading.set(true);
    this.ticketService.getAll().subscribe({
      next: (response) => {
        this.tickets.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.show('Erreur chargement tickets', 'error');
        this.loading.set(false);
      }
    });
  }

  loadProjects() {
    this.ticketService.getProjects().subscribe({
      next: (projects) => this.projects.set(projects)
    });
  }

  loadEpics() {
    this.epicService.getEpics().subscribe({
      next: (epics) => this.epics.set(epics)
    });
  }

  loadMilestones() {
    this.milestoneService.getMilestones().subscribe({
      next: (milestones) => this.milestones.set(milestones)
    });
  }

  loadSprints() {
    this.sprintService.getSprints().subscribe({
      next: (sprints) => this.sprints.set(sprints)
    });
  }

  setView(view: BacklogView) {
    this.currentView.set(view);
  }

  // Project view helpers
  isProjectExpanded(projectId: number): boolean {
    return this.expandedProjects().has(projectId);
  }

  toggleProjectExpanded(projectId: number) {
    const current = new Set(this.expandedProjects());
    if (current.has(projectId)) {
      current.delete(projectId);
    } else {
      current.add(projectId);
    }
    this.expandedProjects.set(current);
  }

  getProjectTickets(projectId: number): Ticket[] {
    return this.tickets().filter(t => !t.archived && t.project_id === projectId);
  }

  // Assignment helpers
  quickAssign(ticketId: number, type: 'sprint' | 'epic' | 'milestone', event: Event) {
    const targetId = parseInt((event.target as HTMLSelectElement).value);
    if (!targetId) return;

    let update: any = {};
    switch (type) {
      case 'sprint': update = { sprint_id: targetId }; break;
      case 'epic': update = { epic_id: targetId }; break;
      case 'milestone': update = { milestone_id: targetId }; break;
    }

    this.ticketService.update(ticketId, update).subscribe({
      next: () => {
        this.toast.show('Ticket assigné', 'success');
        this.loadTickets();
      },
      error: () => this.toast.show('Erreur assignation', 'error')
    });

    (event.target as HTMLSelectElement).value = '';
  }

  assignToSprint(event: Event, sprintId: number) {
    const ticketId = parseInt((event.target as HTMLSelectElement).value);
    if (!ticketId) return;

    this.ticketService.update(ticketId, { sprint_id: sprintId }).subscribe({
      next: () => {
        this.toast.show('Ticket ajouté au sprint', 'success');
        this.loadTickets();
        this.loadSprints();
      },
      error: () => this.toast.show('Erreur assignation', 'error')
    });

    (event.target as HTMLSelectElement).value = '';
  }

  assignToEpic(event: Event, epicId: number) {
    const ticketId = parseInt((event.target as HTMLSelectElement).value);
    if (!ticketId) return;

    this.ticketService.update(ticketId, { epic_id: epicId }).subscribe({
      next: () => {
        this.toast.show('Ticket ajouté à l\'epic', 'success');
        this.loadTickets();
        this.loadEpics();
      },
      error: () => this.toast.show('Erreur assignation', 'error')
    });

    (event.target as HTMLSelectElement).value = '';
  }

  assignToMilestone(event: Event, milestoneId: number) {
    const ticketId = parseInt((event.target as HTMLSelectElement).value);
    if (!ticketId) return;

    this.ticketService.update(ticketId, { milestone_id: milestoneId }).subscribe({
      next: () => {
        this.toast.show('Ticket ajouté au milestone', 'success');
        this.loadTickets();
        this.loadMilestones();
      },
      error: () => this.toast.show('Erreur assignation', 'error')
    });

    (event.target as HTMLSelectElement).value = '';
  }

  isOverdue(dateStr: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
}
