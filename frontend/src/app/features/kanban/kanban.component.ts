import { Component, inject, signal, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TicketService, Ticket, Label, EpicService, MilestoneService, SprintService } from '../../data';
import { Epic, Milestone, Sprint } from '../../data/models';
import { ToastService } from '../../core';

@Component({
  selector: 'app-kanban',
  imports: [FormsModule],
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.scss'
})
export class KanbanComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('ticketInput') ticketInput!: ElementRef<HTMLInputElement>;

  private ticketService = inject(TicketService);
  private epicService = inject(EpicService);
  private milestoneService = inject(MilestoneService);
  private sprintService = inject(SprintService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  tickets = signal<Ticket[]>([]);
  labels = signal<Label[]>([]);
  epics = signal<Epic[]>([]);
  milestones = signal<Milestone[]>([]);
  sprints = signal<Sprint[]>([]);
  loading = signal<boolean>(true);
  filter = signal<string>('all');
  labelFilter = signal<string[]>([]);
  labelDropdownOpen = signal<boolean>(false);
  sortBy = signal<string>('default');
  sortDropdownOpen = signal<boolean>(false);
  epicFilter = signal<number | null>(null);
  epicDropdownOpen = signal<boolean>(false);
  sprintFilter = signal<number | null>(null);
  sprintDropdownOpen = signal<boolean>(false);
  milestoneFilter = signal<number | null>(null);
  milestoneDropdownOpen = signal<boolean>(false);
  draggedTicket = signal<Ticket | null>(null);
  selectMode = signal<boolean>(false);
  selectedTickets = signal<number[]>([]);
  showShortcuts = signal<boolean>(false);
  editingTicketId = signal<number | null>(null);
  showConfirmModal = signal<boolean>(false);
  confirmAction = signal<'bulk' | 'single'>('bulk');
  ticketToDelete = signal<Ticket | null>(null);
  showBulkEditModal = signal<boolean>(false);
  projects = signal<any[]>([]);
  focusedTicketId = signal<number | null>(null);
  focusedColumnIndex = signal<number>(0);

  newTicket = '';
  newPriority = 'do';
  editTitle = '';

  bulkEditData = {
    priority: '',
    project_id: null as number | null,
    addLabels: [] as number[],
    due_date: ''
  };

  columns = [
    { status: 'todo', title: 'A FAIRE', icon: 'fa-clipboard-list' },
    { status: 'in_progress', title: 'EN COURS', icon: 'fa-spinner' },
    { status: 'done', title: 'TERMINE', icon: 'fa-check-circle' }
  ];

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      if (event.key === 'Escape') {
        (event.target as HTMLElement).blur();
      }
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'n':
        event.preventDefault();
        this.ticketInput?.nativeElement?.focus();
        break;
      case 's':
        event.preventDefault();
        this.toggleSelectMode();
        break;
      case '1':
        this.filter.set('do');
        break;
      case '2':
        this.filter.set('plan');
        break;
      case '3':
        this.filter.set('delegate');
        break;
      case '4':
        this.filter.set('eliminate');
        break;
      case '0':
        this.filter.set('all');
        break;
      case 'l':
        event.preventDefault();
        this.toggleLabelDropdown();
        break;
      case '?':
        this.showShortcuts.set(true);
        break;
      case 'escape':
        this.showShortcuts.set(false);
        this.labelDropdownOpen.set(false);
        this.showBulkEditModal.set(false);
        this.showConfirmModal.set(false);
        this.focusedTicketId.set(null);
        if (this.selectMode()) {
          this.toggleSelectMode();
        }
        break;
      case 'arrowdown':
      case 'j':
        event.preventDefault();
        this.navigateTickets('down');
        break;
      case 'arrowup':
      case 'k':
        event.preventDefault();
        this.navigateTickets('up');
        break;
      case 'arrowleft':
      case 'h':
        event.preventDefault();
        this.navigateColumns('left');
        break;
      case 'arrowright':
        event.preventDefault();
        this.navigateColumns('right');
        break;
      case 'enter':
        if (this.focusedTicketId()) {
          const ticket = this.tickets().find(t => t.id === this.focusedTicketId());
          if (ticket) this.openTicket(ticket);
        }
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  handleClick(event: Event) {
    const target = event.target as HTMLElement;
    if (this.labelDropdownOpen() && !target.closest('.label-filter')) {
      this.labelDropdownOpen.set(false);
    }
    if (this.sortDropdownOpen() && !target.closest('.sort-filter')) {
      this.sortDropdownOpen.set(false);
    }
    if (this.epicDropdownOpen() && !target.closest('.planning-filter')) {
      this.epicDropdownOpen.set(false);
    }
    if (this.sprintDropdownOpen() && !target.closest('.planning-filter')) {
      this.sprintDropdownOpen.set(false);
    }
    if (this.milestoneDropdownOpen() && !target.closest('.planning-filter')) {
      this.milestoneDropdownOpen.set(false);
    }
  }

  currentProjectId = signal<number | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const projectId = params['project'] ? parseInt(params['project']) : null;
      this.currentProjectId.set(projectId);

      if (params['epic_id']) {
        this.epicFilter.set(parseInt(params['epic_id']));
      }
      if (params['sprint_id']) {
        this.sprintFilter.set(parseInt(params['sprint_id']));
      }
      if (params['milestone_id']) {
        this.milestoneFilter.set(parseInt(params['milestone_id']));
      }

      this.loadTickets();

      if (params['action'] === 'new') {
        setTimeout(() => {
          this.ticketInput?.nativeElement?.focus();
        }, 100);
      }
    });
    this.loadLabels();
    this.loadProjects();
    this.loadPlanningData();
  }

  loadPlanningData() {
    this.epicService.getEpics().subscribe(data => this.epics.set(data));
    this.milestoneService.getMilestones().subscribe(data => this.milestones.set(data));
    this.sprintService.getSprints().subscribe(data => this.sprints.set(data));
  }

  ngAfterViewInit() {}

  loadProjects() {
    this.ticketService.getProjects().subscribe(data => {
      this.projects.set(data);
    });
  }

  ngOnDestroy() {}

  loadTickets() {
    this.loading.set(true);
    const projectId = this.currentProjectId() || undefined;
    this.ticketService.getAll(projectId).subscribe(response => {
      this.tickets.set(response.data.filter(t => !t.archived));
      this.loading.set(false);
    });
  }

  loadLabels() {
    this.ticketService.getLabels().subscribe(labels => {
      this.labels.set(labels);
    });
  }

  activeTickets() {
    return this.tickets();
  }

  ticketsByStatus(status: string) {
    let filtered = this.tickets().filter(t => t.status === status);

    if (this.filter() !== 'all') {
      filtered = filtered.filter(t => t.priority === this.filter());
    }

    if (this.labelFilter().length > 0) {
      filtered = filtered.filter(t =>
        this.labelFilter().some(labelName => t.labels?.some(l => l.name === labelName))
      );
    }

    if (this.epicFilter()) {
      filtered = filtered.filter(t => t.epic_id === this.epicFilter());
    }

    if (this.sprintFilter()) {
      filtered = filtered.filter(t => t.sprint_id === this.sprintFilter());
    }

    if (this.milestoneFilter()) {
      filtered = filtered.filter(t => t.milestone_id === this.milestoneFilter());
    }

    filtered = this.applySorting(filtered);

    return filtered;
  }

  applySorting(tickets: Ticket[]): Ticket[] {
    const sorted = [...tickets];
    switch (this.sortBy()) {
      case 'date-asc':
        return sorted.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
      case 'date-desc':
        return sorted.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
        });
      case 'priority':
        const priorityOrder: Record<string, number> = { do: 0, plan: 1, delegate: 2, eliminate: 3 };
        return sorted.sort((a, b) =>
          (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
        );
      case 'name':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  }

  countByPriority(priority: string) {
    return this.tickets().filter(t => t.priority === priority).length;
  }

  toggleLabelDropdown() {
    this.labelDropdownOpen.set(!this.labelDropdownOpen());
    this.sortDropdownOpen.set(false);
  }

  toggleLabelFilter(labelName: string) {
    const current = this.labelFilter();
    if (current.includes(labelName)) {
      this.labelFilter.set(current.filter(l => l !== labelName));
    } else {
      this.labelFilter.set([...current, labelName]);
    }
  }

  isLabelSelected(labelName: string): boolean {
    return this.labelFilter().includes(labelName);
  }

  clearLabelFilter() {
    this.labelFilter.set([]);
    this.labelDropdownOpen.set(false);
  }

  getLabelColor(labelName: string): string {
    const label = this.labels().find(l => l.name === labelName);
    return label?.color || '#6c5ce7';
  }

  toggleSortDropdown() {
    this.sortDropdownOpen.set(!this.sortDropdownOpen());
    this.labelDropdownOpen.set(false);
  }

  setSortBy(sort: string) {
    this.sortBy.set(sort);
    this.sortDropdownOpen.set(false);
  }

  getSortLabel(): string {
    const labels: Record<string, string> = {
      'default': 'Trier',
      'date-asc': 'Date ↑',
      'date-desc': 'Date ↓',
      'priority': 'Priorite',
      'name': 'Nom'
    };
    return labels[this.sortBy()] || 'Trier';
  }

  toggleEpicDropdown() {
    this.epicDropdownOpen.set(!this.epicDropdownOpen());
    this.sprintDropdownOpen.set(false);
    this.milestoneDropdownOpen.set(false);
    this.sortDropdownOpen.set(false);
    this.labelDropdownOpen.set(false);
  }

  setEpicFilter(epicId: number | null) {
    this.epicFilter.set(epicId);
    this.epicDropdownOpen.set(false);
  }

  getEpicFilterLabel(): string {
    if (!this.epicFilter()) return 'Epics';
    const epic = this.epics().find(e => e.id === this.epicFilter());
    return epic?.name || 'Epics';
  }

  toggleSprintDropdown() {
    this.sprintDropdownOpen.set(!this.sprintDropdownOpen());
    this.epicDropdownOpen.set(false);
    this.milestoneDropdownOpen.set(false);
    this.sortDropdownOpen.set(false);
    this.labelDropdownOpen.set(false);
  }

  setSprintFilter(sprintId: number | null) {
    this.sprintFilter.set(sprintId);
    this.sprintDropdownOpen.set(false);
  }

  getSprintFilterLabel(): string {
    if (!this.sprintFilter()) return 'Sprints';
    const sprint = this.sprints().find(s => s.id === this.sprintFilter());
    return sprint?.name || 'Sprints';
  }

  toggleMilestoneDropdown() {
    this.milestoneDropdownOpen.set(!this.milestoneDropdownOpen());
    this.epicDropdownOpen.set(false);
    this.sprintDropdownOpen.set(false);
    this.sortDropdownOpen.set(false);
    this.labelDropdownOpen.set(false);
  }

  setMilestoneFilter(milestoneId: number | null) {
    this.milestoneFilter.set(milestoneId);
    this.milestoneDropdownOpen.set(false);
  }

  getMilestoneFilterLabel(): string {
    if (!this.milestoneFilter()) return 'Jalons';
    const milestone = this.milestones().find(m => m.id === this.milestoneFilter());
    return milestone?.name || 'Jalons';
  }

  toggleSelectMode() {
    this.selectMode.set(!this.selectMode());
    if (!this.selectMode()) {
      this.selectedTickets.set([]);
    }
  }

  isSelected(ticket: Ticket): boolean {
    return this.selectedTickets().includes(ticket.id);
  }

  toggleSelection(ticket: Ticket) {
    const current = this.selectedTickets();
    if (current.includes(ticket.id)) {
      this.selectedTickets.set(current.filter(id => id !== ticket.id));
    } else {
      this.selectedTickets.set([...current, ticket.id]);
    }
  }

  selectAllInColumn(status: string) {
    const columnTickets = this.ticketsByStatus(status);
    const currentSelected = this.selectedTickets();
    const columnIds = columnTickets.map(t => t.id);
    const allSelected = columnIds.every(id => currentSelected.includes(id));

    if (allSelected) {
      this.selectedTickets.set(currentSelected.filter(id => !columnIds.includes(id)));
    } else {
      const newSelection = [...new Set([...currentSelected, ...columnIds])];
      this.selectedTickets.set(newSelection);
    }
  }

  clearSelection() {
    this.selectedTickets.set([]);
  }

  onCardClick(ticket: Ticket, event: Event) {
    if (this.selectMode()) {
      this.toggleSelection(ticket);
    } else {
      this.openTicket(ticket);
    }
  }

  bulkSetStatus(status: string) {
    const ids = this.selectedTickets();
    const statusLabels: Record<string, string> = {
      'todo': 'A faire',
      'in_progress': 'En cours',
      'done': 'Termine'
    };
    let completed = 0;
    ids.forEach(id => {
      this.ticketService.update(id, { status: status as any }).subscribe(() => {
        completed++;
        if (completed === ids.length) {
          this.loadTickets();
          this.clearSelection();
          this.toast.success(`${ids.length} ticket(s) deplace(s) vers "${statusLabels[status]}"`);
        }
      });
    });
  }

  bulkArchive() {
    const ids = this.selectedTickets();
    let completed = 0;
    ids.forEach(id => {
      this.ticketService.update(id, { archived: true }).subscribe(() => {
        completed++;
        if (completed === ids.length) {
          this.loadTickets();
          this.clearSelection();
          this.toast.success(`${ids.length} ticket(s) archive(s)`);
        }
      });
    });
  }

  bulkDelete() {
    this.confirmAction.set('bulk');
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.ticketToDelete.set(null);
  }

  confirmDelete() {
    if (this.confirmAction() === 'bulk') {
      this.confirmBulkDelete();
    } else {
      this.confirmSingleDelete();
    }
  }

  confirmBulkDelete() {
    const ids = this.selectedTickets();
    let completed = 0;
    ids.forEach(id => {
      this.ticketService.delete(id).subscribe(() => {
        completed++;
        if (completed === ids.length) {
          this.loadTickets();
          this.clearSelection();
          this.closeConfirmModal();
          this.toast.success(`${ids.length} ticket(s) supprime(s)`);
        }
      });
    });
  }

  confirmSingleDelete() {
    const ticket = this.ticketToDelete();
    if (!ticket) return;
    this.ticketService.delete(ticket.id).subscribe(() => {
      this.loadTickets();
      this.closeConfirmModal();
      this.toast.info(`Ticket supprime`);
    });
  }

  openTicket(ticket: Ticket) {
    this.router.navigate(['/ticket', ticket.id]);
  }

  addTicket() {
    if (this.newTicket.trim()) {
      const projectId = this.currentProjectId() || 1;
      this.ticketService.create(this.newTicket.trim(), this.newPriority, projectId).subscribe(() => {
        this.toast.success(`Ticket "${this.newTicket.trim()}" cree`);
        this.newTicket = '';
        this.loadTickets();
      });
    }
  }

  deleteTicket(ticket: Ticket, event: Event) {
    event.stopPropagation();
    this.ticketToDelete.set(ticket);
    this.confirmAction.set('single');
    this.showConfirmModal.set(true);
  }

  onDragStart(event: DragEvent, ticket: Ticket) {
    if (this.selectMode()) {
      event.preventDefault();
      return;
    }
    this.draggedTicket.set(ticket);
    event.dataTransfer?.setData('text/plain', ticket.id.toString());
  }

  onDragEnd() {
    this.draggedTicket.set(null);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, newStatus: string) {
    event.preventDefault();
    const ticket = this.draggedTicket();
    if (ticket && ticket.status !== newStatus) {
      this.ticketService.update(ticket.id, { status: newStatus as any }).subscribe(() => {
        this.loadTickets();
      });
    }
    this.draggedTicket.set(null);
  }

  getProgress(ticket: Ticket): number {
    if (!ticket.task_count) return 0;
    return (ticket.task_done! / ticket.task_count) * 100;
  }

  isOverdue(ticket: Ticket): boolean {
    if (!ticket.due_date || ticket.status === 'done') return false;
    return new Date(ticket.due_date) < new Date();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h${m}m`;
    return `${m}m`;
  }

  startQuickEdit(ticket: Ticket, event: Event) {
    event.stopPropagation();
    this.editingTicketId.set(ticket.id);
    this.editTitle = ticket.title;
    setTimeout(() => {
      const input = document.querySelector('.quick-edit-input') as HTMLInputElement;
      input?.focus();
      input?.select();
    }, 0);
  }

  saveQuickEdit(ticket: Ticket) {
    if (this.editTitle.trim() && this.editTitle !== ticket.title) {
      this.ticketService.update(ticket.id, { title: this.editTitle.trim() }).subscribe(() => {
        this.loadTickets();
        this.toast.success('Titre mis a jour');
      });
    }
    this.editingTicketId.set(null);
    this.editTitle = '';
  }

  cancelQuickEdit() {
    this.editingTicketId.set(null);
    this.editTitle = '';
  }

  cyclePriority(ticket: Ticket, event: Event) {
    event.stopPropagation();
    const priorities = ['do', 'plan', 'delegate', 'eliminate'];
    const currentIndex = priorities.indexOf(ticket.priority);
    const nextPriority = priorities[(currentIndex + 1) % priorities.length];
    this.ticketService.update(ticket.id, { priority: nextPriority as any }).subscribe(() => {
      this.loadTickets();
    });
  }

  toggleTicketPin(ticket: Ticket, event: Event) {
    event.stopPropagation();
    this.ticketService.togglePin(ticket.id).subscribe(() => {
      this.loadTickets();
    });
  }

  openBulkEditModal() {
    this.bulkEditData = {
      priority: '',
      project_id: null,
      addLabels: [],
      due_date: ''
    };
    this.showBulkEditModal.set(true);
  }

  closeBulkEditModal() {
    this.showBulkEditModal.set(false);
  }

  toggleBulkLabel(labelId: number) {
    const current = this.bulkEditData.addLabels;
    const index = current.indexOf(labelId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(labelId);
    }
  }

  applyBulkEdit() {
    const ids = this.selectedTickets();
    let completed = 0;
    let changes: string[] = [];

    ids.forEach(id => {
      const updateData: any = {};

      if (this.bulkEditData.priority) {
        updateData.priority = this.bulkEditData.priority;
      }
      if (this.bulkEditData.project_id) {
        updateData.project_id = this.bulkEditData.project_id;
      }
      if (this.bulkEditData.due_date) {
        updateData.due_date = this.bulkEditData.due_date;
      }

      if (Object.keys(updateData).length > 0) {
        this.ticketService.update(id, updateData).subscribe(() => {
          this.checkBulkEditComplete(++completed, ids.length);
        });
      } else {
        this.checkBulkEditComplete(++completed, ids.length);
      }

      this.bulkEditData.addLabels.forEach(labelId => {
        this.ticketService.addLabelToTicket(id, labelId).subscribe();
      });
    });

    if (this.bulkEditData.priority) changes.push('priorite');
    if (this.bulkEditData.project_id) changes.push('projet');
    if (this.bulkEditData.due_date) changes.push('echeance');
    if (this.bulkEditData.addLabels.length > 0) changes.push('labels');

    this.closeBulkEditModal();
    this.toast.success(`${ids.length} ticket(s) modifie(s): ${changes.join(', ')}`);
  }

  checkBulkEditComplete(completed: number, total: number) {
    if (completed === total) {
      this.loadTickets();
      this.clearSelection();
    }
  }

  navigateTickets(direction: 'up' | 'down') {
    const columnStatus = this.columns[this.focusedColumnIndex()].status;
    const columnTickets = this.ticketsByStatus(columnStatus);

    if (columnTickets.length === 0) return;

    const currentIndex = columnTickets.findIndex(t => t.id === this.focusedTicketId());

    if (currentIndex === -1) {
      this.focusedTicketId.set(columnTickets[0].id);
    } else if (direction === 'down') {
      const nextIndex = Math.min(currentIndex + 1, columnTickets.length - 1);
      this.focusedTicketId.set(columnTickets[nextIndex].id);
    } else {
      const prevIndex = Math.max(currentIndex - 1, 0);
      this.focusedTicketId.set(columnTickets[prevIndex].id);
    }

    setTimeout(() => {
      const focusedCard = document.querySelector('.kanban-card.keyboard-focus');
      focusedCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  }

  navigateColumns(direction: 'left' | 'right') {
    const currentCol = this.focusedColumnIndex();
    if (direction === 'left' && currentCol > 0) {
      this.focusedColumnIndex.set(currentCol - 1);
    } else if (direction === 'right' && currentCol < this.columns.length - 1) {
      this.focusedColumnIndex.set(currentCol + 1);
    }

    const columnStatus = this.columns[this.focusedColumnIndex()].status;
    const columnTickets = this.ticketsByStatus(columnStatus);
    if (columnTickets.length > 0) {
      this.focusedTicketId.set(columnTickets[0].id);
    } else {
      this.focusedTicketId.set(null);
    }
  }
}
