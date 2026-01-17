import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MilestoneService, TicketService } from '../../data/services';
import { Milestone, Project } from '../../data/models';
import { ToastService } from '../../core/services';
import { ProgressRingComponent } from '../../shared/components/progress-ring.component';

@Component({
  selector: 'app-milestones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProgressRingComponent],
  templateUrl: './milestones.component.html',
  styleUrl: './milestones.component.scss'
})
export class MilestonesComponent implements OnInit {
  private milestoneService = inject(MilestoneService);
  private ticketService = inject(TicketService);
  private toast = inject(ToastService);

  milestones = signal<Milestone[]>([]);
  projects = signal<Project[]>([]);
  loading = signal(true);
  filterProjectId = signal<number | null>(null);
  filterStatus = signal<string | null>(null);
  editingMilestone = signal<Milestone | null>(null);
  addingTicketToMilestone = signal<number | null>(null);
  newTicketTitle = '';

  newMilestone = {
    name: '',
    due_date: '',
    project_id: null as number | null
  };

  filteredMilestones = computed(() => {
    let result = this.milestones();
    const status = this.filterStatus();
    const projectId = this.filterProjectId();

    if (status) {
      result = result.filter(m => m.status === status);
    }
    if (projectId) {
      result = result.filter(m => m.project_id === projectId);
    }
    // Sort by due date
    return result.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  });

  ngOnInit() {
    this.loadProjects();
    this.loadMilestones();
  }

  loadProjects() {
    this.ticketService.getProjects().subscribe({
      next: (projects) => this.projects.set(projects),
      error: () => this.toast.show('Erreur chargement projets', 'error')
    });
  }

  loadMilestones() {
    this.loading.set(true);
    const projectId = this.filterProjectId() ?? undefined;
    this.milestoneService.getMilestones(projectId).subscribe({
      next: (milestones) => {
        this.milestones.set(milestones);
        this.loading.set(false);
      },
      error: () => {
        this.toast.show('Erreur chargement milestones', 'error');
        this.loading.set(false);
      }
    });
  }

  createMilestone() {
    if (!this.newMilestone.name.trim() || !this.newMilestone.due_date) return;

    this.milestoneService.createMilestone({
      name: this.newMilestone.name.trim(),
      due_date: this.newMilestone.due_date,
      project_id: this.newMilestone.project_id || undefined
    }).subscribe({
      next: (milestone) => {
        this.milestones.update(list => [milestone, ...list]);
        this.newMilestone.name = '';
        this.newMilestone.due_date = '';
        this.toast.show('Jalon cree', 'success');
      },
      error: () => this.toast.show('Erreur creation jalon', 'error')
    });
  }

  startEdit(milestone: Milestone) {
    this.editingMilestone.set({ ...milestone });
  }

  cancelEdit() {
    this.editingMilestone.set(null);
  }

  saveMilestone() {
    const milestone = this.editingMilestone();
    if (!milestone) return;

    this.milestoneService.updateMilestone(milestone.id, {
      name: milestone.name,
      description: milestone.description,
      due_date: milestone.due_date,
      status: milestone.status
    }).subscribe({
      next: (updated) => {
        this.milestones.update(list => list.map(m => m.id === updated.id ? updated : m));
        this.editingMilestone.set(null);
        this.toast.show('Jalon modifie', 'success');
      },
      error: () => this.toast.show('Erreur modification jalon', 'error')
    });
  }

  toggleStatus(milestone: Milestone) {
    const newStatus = milestone.status === 'open' ? 'closed' : 'open';
    this.milestoneService.updateMilestone(milestone.id, { status: newStatus }).subscribe({
      next: (updated) => {
        this.milestones.update(list => list.map(m => m.id === updated.id ? updated : m));
        this.toast.show(newStatus === 'closed' ? 'Jalon ferme' : 'Jalon rouvert', 'success');
      },
      error: () => this.toast.show('Erreur mise a jour', 'error')
    });
  }

  deleteMilestone(milestone: Milestone) {
    if (!confirm(`Supprimer le jalon "${milestone.name}" ?`)) return;

    this.milestoneService.deleteMilestone(milestone.id).subscribe({
      next: () => {
        this.milestones.update(list => list.filter(m => m.id !== milestone.id));
        this.toast.show('Jalon supprime', 'success');
      },
      error: () => this.toast.show('Erreur suppression jalon', 'error')
    });
  }

  setFilterStatus(status: string | null) {
    this.filterStatus.set(status);
  }

  isOverdue(milestone: Milestone): boolean {
    if (milestone.status === 'closed') return false;
    return new Date(milestone.due_date) < new Date();
  }

  getDaysRemaining(milestone: Milestone): number {
    const diff = new Date(milestone.due_date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  startAddTicket(milestone: Milestone) {
    this.addingTicketToMilestone.set(milestone.id);
    this.newTicketTitle = '';
  }

  cancelAddTicket() {
    this.addingTicketToMilestone.set(null);
    this.newTicketTitle = '';
  }

  createTicketForMilestone(milestone: Milestone) {
    if (!this.newTicketTitle.trim()) return;

    this.ticketService.create(this.newTicketTitle.trim(), 'plan', milestone.project_id || 1).subscribe({
      next: (ticket) => {
        this.ticketService.update(ticket.id, { milestone_id: milestone.id }).subscribe({
          next: () => {
            this.toast.show('Ticket cree', 'success');
            this.cancelAddTicket();
            this.loadMilestones();
          },
          error: () => this.toast.show('Erreur association milestone', 'error')
        });
      },
      error: () => this.toast.show('Erreur creation ticket', 'error')
    });
  }
}
