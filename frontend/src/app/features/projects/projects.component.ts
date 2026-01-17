import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { TicketService, Project, Ticket } from '../../data';

@Component({
  selector: 'app-projects',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  projects = signal<Project[]>([]);
  editingId = signal<number | null>(null);
  showIconPicker = signal<boolean>(false);
  showConvertToTaskModal = signal<boolean>(false);
  availableTickets = signal<Ticket[]>([]);

  newName = '';
  newColor = '#6c5ce7';
  newIcon = 'fa-folder';

  editName = '';
  editColor = '';
  editDescription = '';

  // Transformation
  selectedProjectForConversion: Project | null = null;
  targetTicketId = 0;

  availableIcons = [
    'fa-folder', 'fa-briefcase', 'fa-home', 'fa-code', 'fa-palette',
    'fa-shopping-cart', 'fa-heart', 'fa-star', 'fa-rocket', 'fa-gamepad',
    'fa-graduation-cap', 'fa-music', 'fa-camera', 'fa-plane', 'fa-car',
    'fa-utensils', 'fa-book', 'fa-film', 'fa-gift', 'fa-leaf'
  ];

  ngOnInit() {
    this.loadProjects();
    this.loadAvailableTickets();
  }

  loadAvailableTickets() {
    this.ticketService.getAll().subscribe(response => {
      this.availableTickets.set(response.data.filter(t => !t.archived));
    });
  }

  loadProjects() {
    this.ticketService.getProjects().subscribe(data => {
      this.projects.set(data);
    });
  }

  createProject() {
    if (!this.newName.trim()) return;
    this.ticketService.createProject(this.newName.trim(), this.newColor, this.newIcon).subscribe(() => {
      this.newName = '';
      this.newColor = '#6c5ce7';
      this.newIcon = 'fa-folder';
      this.loadProjects();
    });
  }

  selectIcon(icon: string) {
    this.newIcon = icon;
    this.showIconPicker.set(false);
  }

  startEdit(project: Project) {
    this.editingId.set(project.id);
    this.editName = project.name;
    this.editColor = project.color;
    this.editDescription = project.description || '';
  }

  saveEdit(project: Project) {
    this.ticketService.updateProject(project.id, {
      name: this.editName,
      color: this.editColor,
      description: this.editDescription
    }).subscribe(() => {
      this.editingId.set(null);
      this.loadProjects();
    });
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  deleteProject(project: Project) {
    if (confirm(`Supprimer le projet "${project.name}" ? Les tickets seront deplaces vers Inbox.`)) {
      this.ticketService.deleteProject(project.id).subscribe(() => {
        this.loadProjects();
      });
    }
  }

  viewProject(project: Project) {
    this.router.navigate(['/kanban'], { queryParams: { project: project.id } });
  }

  openWhiteboard(project: Project) {
    this.router.navigate(['/projects', project.id, 'whiteboard']);
  }

  getProgress(project: Project): number {
    if (!project.ticket_count || project.ticket_count === 0) return 0;
    return ((project.ticket_done || 0) / project.ticket_count) * 100;
  }

  convertToTicket(project: Project) {
    if (confirm(`Convertir le projet "${project.name}" en ticket ?\nLes tickets du projet deviendront des taches.`)) {
      this.ticketService.projectToTicket(project.id).subscribe({
        next: (newTicket) => {
          this.router.navigate(['/ticket', newTicket.id]);
        },
        error: () => alert('Erreur lors de la conversion')
      });
    }
  }

  showConvertToTask(project: Project) {
    this.selectedProjectForConversion = project;
    this.targetTicketId = 0;
    this.showConvertToTaskModal.set(true);
  }

  convertToTask() {
    if (!this.targetTicketId || !this.selectedProjectForConversion) return;

    if (confirm(`Convertir le projet "${this.selectedProjectForConversion.name}" en tache ?\nLes tickets du projet deviendront des sous-taches.`)) {
      this.ticketService.projectToTask(this.selectedProjectForConversion.id, this.targetTicketId).subscribe({
        next: () => {
          this.showConvertToTaskModal.set(false);
          this.router.navigate(['/ticket', this.targetTicketId]);
        },
        error: () => alert('Erreur lors de la conversion')
      });
    }
  }
}
