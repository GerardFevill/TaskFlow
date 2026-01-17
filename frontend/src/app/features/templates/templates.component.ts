import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TicketService, Template, Project } from '../../data';

@Component({
  selector: 'app-templates',
  imports: [FormsModule, SlicePipe],
  templateUrl: './templates.component.html',
  styleUrl: './templates.component.scss'
})
export class TemplatesComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  templates = signal<Template[]>([]);
  projects = signal<Project[]>([]);
  showCreateModal = signal(false);
  showUseModal = signal(false);

  newTemplate = {
    name: '',
    title: '',
    description: '',
    priority: 'do',
    project_id: null as number | null
  };

  selectedTemplate: Template | null = null;
  useTicketTitle = '';
  useTicketProjectId: number = 1;

  ngOnInit() {
    this.loadTemplates();
    this.loadProjects();
  }

  loadTemplates() {
    this.ticketService.getTemplates().subscribe(data => this.templates.set(data));
  }

  loadProjects() {
    this.ticketService.getProjects().subscribe(data => {
      this.projects.set(data);
      if (data.length > 0) {
        this.useTicketProjectId = data[0].id;
      }
    });
  }

  openCreateModal() {
    this.newTemplate = { name: '', title: '', description: '', priority: 'do', project_id: null };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  createTemplate() {
    this.ticketService.createTemplate(this.newTemplate).subscribe(() => {
      this.loadTemplates();
      this.closeCreateModal();
    });
  }

  deleteTemplate(template: Template) {
    if (confirm(`Supprimer le template "${template.name}" ?`)) {
      this.ticketService.deleteTemplate(template.id).subscribe(() => {
        this.loadTemplates();
      });
    }
  }

  useTemplate(template: Template) {
    this.selectedTemplate = template;
    this.useTicketTitle = template.title;
    this.useTicketProjectId = template.project_id || this.projects()[0]?.id || 1;
    this.showUseModal.set(true);
  }

  closeUseModal() {
    this.showUseModal.set(false);
    this.selectedTemplate = null;
  }

  createFromTemplate() {
    if (this.selectedTemplate) {
      this.ticketService.createFromTemplate(
        this.selectedTemplate.id,
        this.useTicketTitle,
        this.useTicketProjectId
      ).subscribe(ticket => {
        this.closeUseModal();
        this.router.navigate(['/ticket', ticket.id]);
      });
    }
  }

  formatPriority(priority: string): string {
    const map: Record<string, string> = {
      do: 'Faire',
      plan: 'Planifier',
      delegate: 'Deleguer',
      eliminate: 'Eliminer'
    };
    return map[priority] || priority;
  }
}
