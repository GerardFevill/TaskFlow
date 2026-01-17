import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketService, EpicService, MilestoneService, SprintService } from '../../data/services';
import { Project, Label } from '../../data/models';
import { Epic, Milestone, Sprint } from '../../data/models';
import { ToastService } from '../../core/services';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-create.component.html',
  styleUrl: './ticket-create.component.scss'
})
export class TicketCreateComponent implements OnInit {
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private epicService = inject(EpicService);
  private milestoneService = inject(MilestoneService);
  private sprintService = inject(SprintService);
  private toast = inject(ToastService);

  projects = signal<Project[]>([]);
  epics = signal<Epic[]>([]);
  milestones = signal<Milestone[]>([]);
  sprints = signal<Sprint[]>([]);
  labels = signal<Label[]>([]);
  selectedLabels = signal<number[]>([]);

  // Filter unique labels by name (keep first occurrence)
  uniqueLabels = computed(() => {
    const seen = new Set<string>();
    return this.labels().filter(label => {
      if (seen.has(label.name)) {
        return false;
      }
      seen.add(label.name);
      return true;
    });
  });

  ticket = {
    title: '',
    description: '',
    priority: 'plan' as string,
    status: 'todo' as string,
    start_date: '',
    due_date: '',
    project_id: 1 as number,
    epic_id: null as number | null,
    sprint_id: null as number | null,
    milestone_id: null as number | null,
    recurrence: 'none' as string,
    reminder_days: 0,
    time_estimated: 0
  };

  ngOnInit() {
    this.loadProjects();
    this.loadEpics();
    this.loadMilestones();
    this.loadSprints();
    this.loadLabels();
  }

  loadProjects() {
    this.ticketService.getProjects().subscribe({
      next: (projects) => this.projects.set(projects),
      error: () => this.toast.show('Erreur chargement projets', 'error')
    });
  }

  loadEpics() {
    this.epicService.getEpics().subscribe({
      next: (epics) => this.epics.set(epics),
      error: () => this.toast.show('Erreur chargement epics', 'error')
    });
  }

  loadMilestones() {
    this.milestoneService.getMilestones().subscribe({
      next: (milestones) => this.milestones.set(milestones),
      error: () => this.toast.show('Erreur chargement milestones', 'error')
    });
  }

  loadSprints() {
    this.sprintService.getSprints().subscribe({
      next: (sprints) => this.sprints.set(sprints),
      error: () => this.toast.show('Erreur chargement sprints', 'error')
    });
  }

  loadLabels() {
    this.ticketService.getLabels().subscribe({
      next: (labels) => this.labels.set(labels),
      error: () => this.toast.show('Erreur chargement labels', 'error')
    });
  }

  isLabelSelected(labelId: number): boolean {
    return this.selectedLabels().includes(labelId);
  }

  toggleLabel(labelId: number) {
    const current = this.selectedLabels();
    if (current.includes(labelId)) {
      this.selectedLabels.set(current.filter(id => id !== labelId));
    } else {
      this.selectedLabels.set([...current, labelId]);
    }
  }

  createTicket() {
    if (!this.ticket.title.trim()) return;

    // Create the ticket
    this.ticketService.create(
      this.ticket.title.trim(),
      this.ticket.priority,
      this.ticket.project_id
    ).subscribe({
      next: (created) => {
        // Update with additional fields
        const updates: any = {};
        if (this.ticket.description) updates.description = this.ticket.description;
        if (this.ticket.status !== 'todo') updates.status = this.ticket.status;
        if (this.ticket.start_date) updates.start_date = this.ticket.start_date;
        if (this.ticket.due_date) updates.due_date = this.ticket.due_date;
        if (this.ticket.epic_id) updates.epic_id = this.ticket.epic_id;
        if (this.ticket.sprint_id) updates.sprint_id = this.ticket.sprint_id;
        if (this.ticket.milestone_id) updates.milestone_id = this.ticket.milestone_id;
        if (this.ticket.recurrence !== 'none') updates.recurrence = this.ticket.recurrence;
        if (this.ticket.reminder_days > 0) updates.reminder_days = this.ticket.reminder_days;
        if (this.ticket.time_estimated > 0) updates.time_estimated = this.ticket.time_estimated;

        if (Object.keys(updates).length > 0) {
          this.ticketService.update(created.id, updates).subscribe();
        }

        // Add labels
        const labels = this.selectedLabels();
        if (labels.length > 0) {
          labels.forEach(labelId => {
            this.ticketService.addLabelToTicket(created.id, labelId).subscribe();
          });
        }

        this.toast.show('Ticket créé', 'success');
        this.router.navigate(['/ticket', created.id]);
      },
      error: () => this.toast.show('Erreur création ticket', 'error')
    });
  }

  goBack() {
    this.router.navigate(['/kanban']);
  }
}
