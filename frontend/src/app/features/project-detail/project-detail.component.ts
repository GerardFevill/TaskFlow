import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService, Project, Deliverable, Resource, Risk, ProjectStatus } from '../../data';

@Component({
  selector: 'app-project-detail',
  imports: [FormsModule],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss'
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);

  project = signal<Project | null>(null);
  tab = signal<'overview' | 'deliverables' | 'resources' | 'risks' | 'budget'>('overview');

  // Status options
  statusOptions: { value: ProjectStatus; label: string; color: string }[] = [
    { value: 'planning', label: 'Planification', color: '#8b5cf6' },
    { value: 'active', label: 'Actif', color: '#22c55e' },
    { value: 'on_hold', label: 'En pause', color: '#f59e0b' },
    { value: 'completed', label: 'Termine', color: '#3b82f6' },
    { value: 'cancelled', label: 'Annule', color: '#ef4444' }
  ];

  // New item forms
  newDeliverable: Partial<Deliverable> = { name: '', status: 'pending' };
  newResource: Partial<Resource> = { name: '', role: '', allocation: 100 };
  newRisk: Partial<Risk> = { description: '', probability: 'medium', impact: 'medium', status: 'identified' };

  Math = Math;

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadProject(+params['id']);
      }
    });
  }

  loadProject(id: number) {
    this.ticketService.getProject(id).subscribe({
      next: (data) => this.project.set(data),
      error: () => this.router.navigate(['/projects'])
    });
  }

  goBack() {
    this.router.navigate(['/projects']);
  }

  updateProject() {
    const p = this.project();
    if (!p) return;
    this.ticketService.updateProject(p.id, p).subscribe({
      next: (updated) => this.project.set(updated)
    });
  }

  // Status
  getStatusInfo(status: ProjectStatus) {
    return this.statusOptions.find(s => s.value === status) || this.statusOptions[0];
  }

  setStatus(status: ProjectStatus) {
    const p = this.project();
    if (!p) return;
    p.status = status;
    this.updateProject();
  }

  // Budget
  getBudgetProgress(): number {
    const p = this.project();
    if (!p || !p.budget || p.budget === 0) return 0;
    return ((p.budget_spent || 0) / p.budget) * 100;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  // Deliverables
  addDeliverable() {
    const p = this.project();
    if (!p || !this.newDeliverable.name?.trim()) return;

    const deliverables = [...(p.deliverables || [])];
    deliverables.push({
      id: crypto.randomUUID(),
      name: this.newDeliverable.name.trim(),
      description: this.newDeliverable.description || '',
      status: this.newDeliverable.status || 'pending',
      due_date: this.newDeliverable.due_date
    });

    p.deliverables = deliverables;
    this.newDeliverable = { name: '', status: 'pending' };
    this.updateProject();
  }

  updateDeliverable(deliverable: Deliverable) {
    this.updateProject();
  }

  removeDeliverable(id: string) {
    const p = this.project();
    if (!p) return;
    p.deliverables = (p.deliverables || []).filter(d => d.id !== id);
    this.updateProject();
  }

  getDeliverableProgress(): number {
    const p = this.project();
    if (!p?.deliverables?.length) return 0;
    const completed = p.deliverables.filter(d => d.status === 'completed').length;
    return (completed / p.deliverables.length) * 100;
  }

  // Resources
  addResource() {
    const p = this.project();
    if (!p || !this.newResource.name?.trim()) return;

    const resources = [...(p.resources || [])];
    resources.push({
      id: crypto.randomUUID(),
      name: this.newResource.name.trim(),
      role: this.newResource.role || '',
      allocation: this.newResource.allocation || 100
    });

    p.resources = resources;
    this.newResource = { name: '', role: '', allocation: 100 };
    this.updateProject();
  }

  removeResource(id: string) {
    const p = this.project();
    if (!p) return;
    p.resources = (p.resources || []).filter(r => r.id !== id);
    this.updateProject();
  }

  getTotalAllocation(): number {
    const p = this.project();
    if (!p?.resources?.length) return 0;
    return p.resources.reduce((sum, r) => sum + (r.allocation || 0), 0);
  }

  // Risks
  addRisk() {
    const p = this.project();
    if (!p || !this.newRisk.description?.trim()) return;

    const risks = [...(p.risks || [])];
    risks.push({
      id: crypto.randomUUID(),
      description: this.newRisk.description.trim(),
      probability: this.newRisk.probability || 'medium',
      impact: this.newRisk.impact || 'medium',
      mitigation: this.newRisk.mitigation || '',
      status: this.newRisk.status || 'identified'
    });

    p.risks = risks;
    this.newRisk = { description: '', probability: 'medium', impact: 'medium', status: 'identified' };
    this.updateProject();
  }

  updateRisk(risk: Risk) {
    this.updateProject();
  }

  removeRisk(id: string) {
    const p = this.project();
    if (!p) return;
    p.risks = (p.risks || []).filter(r => r.id !== id);
    this.updateProject();
  }

  getRiskLevel(probability: string, impact: string): string {
    const levels: Record<string, number> = { low: 1, medium: 2, high: 3 };
    const score = levels[probability] * levels[impact];
    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  getActiveRisksCount(): number {
    const p = this.project();
    if (!p?.risks?.length) return 0;
    return p.risks.filter(r => r.status === 'identified' || r.status === 'occurred').length;
  }

  // Timeline
  getDaysRemaining(): number | null {
    const p = this.project();
    if (!p?.end_date) return null;
    const end = new Date(p.end_date);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  getTimelineProgress(): number {
    const p = this.project();
    if (!p?.start_date || !p?.end_date) return 0;
    const start = new Date(p.start_date).getTime();
    const end = new Date(p.end_date).getTime();
    const today = new Date().getTime();
    if (today <= start) return 0;
    if (today >= end) return 100;
    return ((today - start) / (end - start)) * 100;
  }
}
