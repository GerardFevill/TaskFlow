import { Component, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService, Task, TicketService, Ticket, Label, Comment, Activity, Attachment, Project, Dependency, EpicService, MilestoneService, SprintService, Reaction } from '../../data';
import { Epic, Milestone, Sprint } from '../../data/models';
import { ToastService } from '../../core';
import { MarkdownPipe } from '../../shared';

@Component({
  selector: 'app-ticket-detail',
  imports: [FormsModule, MarkdownPipe],
  templateUrl: './ticket-detail.component.html',
  styleUrl: './ticket-detail.component.scss'
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private taskService = inject(TaskService);
  private epicService = inject(EpicService);
  private milestoneService = inject(MilestoneService);
  private sprintService = inject(SprintService);
  private toast = inject(ToastService);

  ticket = signal<Ticket | null>(null);
  tasks = signal<Task[]>([]);
  ticketLabels = signal<Label[]>([]);
  labels = signal<Label[]>([]);
  comments = signal<Comment[]>([]);
  activities = signal<Activity[]>([]);
  attachments = signal<Attachment[]>([]);
  tab = signal<string>('info');
  expandedTask = signal<number | null>(null);

  timerActive = signal<boolean>(false);
  timerSeconds = signal<number>(0);
  private timerInterval: any;

  newLabelName = '';
  private defaultLabelColors = ['#6c5ce7', '#00cec9', '#e17055', '#fdcb6e', '#74b9ff', '#a29bfe', '#55efc4', '#fd79a8'];
  private labelColorIndex = 0;

  // New features
  projects = signal<Project[]>([]);
  epics = signal<Epic[]>([]);
  milestones = signal<Milestone[]>([]);
  sprints = signal<Sprint[]>([]);
  dependencies = signal<{ blockedBy: Dependency[], blocks: Dependency[] }>({ blockedBy: [], blocks: [] });
  availableTickets = signal<Ticket[]>([]);
  newDependencyId = '';

  // Drag & drop tasks
  draggedTaskId = signal<number | null>(null);
  draggedTaskIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);

  newTask = '';
  newSubtask = '';
  newComment = '';
  addMinutes = 0;
  Math = Math;

  // Transformations
  showConvertToTaskModal = signal<boolean>(false);
  targetTicketId = 0;

  // Title editing
  editingTitle = signal<boolean>(false);
  editTitle = '';

  // Delete confirmation modal
  showDeleteModal = signal<boolean>(false);

  // Last deleted task for undo
  lastDeletedTask: { text: string; ticketId: number; done: boolean } | null = null;

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    // Ctrl+Z pour annuler la suppression de tache
    if (event.ctrlKey && event.key === 'z' && this.lastDeletedTask) {
      event.preventDefault();
      this.undoDeleteTask();
    }
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.loadTicket(id);
      this.loadLabels();
      this.loadProjects();
      this.loadPlanningData();
      this.loadDependencies(id);
      this.loadAvailableTickets();
    });
  }

  loadPlanningData() {
    this.epicService.getEpics().subscribe(data => this.epics.set(data));
    this.milestoneService.getMilestones().subscribe(data => this.milestones.set(data));
    this.sprintService.getSprints().subscribe(data => this.sprints.set(data));
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  loadTicket(id: number) {
    this.ticketService.getOne(id).subscribe(data => {
      this.ticket.set(data);
      this.loadTasks();
      this.loadTicketLabels();
      this.loadComments();
      this.loadAttachments();
    });
  }

  loadTasks() {
    if (this.ticket()) {
      this.taskService.getByTicket(this.ticket()!.id).subscribe(data => {
        data.forEach(task => {
          this.taskService.getSubtasks(task.id).subscribe(subtasks => {
            task.subtasks = subtasks;
            this.tasks.set([...this.tasks()]);
          });
        });
        this.tasks.set(data.filter(t => !t.parent_id));
      });
    }
  }

  loadLabels() {
    this.ticketService.getLabels().subscribe(data => this.labels.set(data));
  }

  loadTicketLabels() {
    if (this.ticket()) {
      this.ticketService.getTicketLabels(this.ticket()!.id).subscribe(data => this.ticketLabels.set(data));
    }
  }

  loadComments() {
    if (this.ticket()) {
      this.ticketService.getComments(this.ticket()!.id).subscribe(data => this.comments.set(data));
    }
  }

  loadActivity() {
    if (this.ticket()) {
      this.ticketService.getActivity(this.ticket()!.id).subscribe(data => this.activities.set(data));
    }
  }

  loadAttachments() {
    if (this.ticket()) {
      this.ticketService.getAttachments(this.ticket()!.id).subscribe(data => this.attachments.set(data));
    }
  }

  goBack() {
    this.router.navigate(['/kanban']);
  }

  updateTicket() {
    if (this.ticket()) {
      const t = this.ticket()!;
      this.ticketService.update(t.id, {
        priority: t.priority,
        status: t.status,
        description: t.description,
        due_date: t.due_date || undefined,
        start_date: t.start_date || undefined,
        recurrence: t.recurrence,
        reminder_days: t.reminder_days,
        time_estimated: t.time_estimated
      }).subscribe(updated => this.ticket.set(updated));
    }
  }

  // Title editing
  startEditTitle() {
    if (this.ticket()) {
      this.editTitle = this.ticket()!.title;
      this.editingTitle.set(true);
      setTimeout(() => {
        const input = document.querySelector('.title-edit-input') as HTMLInputElement;
        input?.focus();
        input?.select();
      }, 0);
    }
  }

  saveTitle() {
    if (this.ticket() && this.editTitle.trim() && this.editTitle !== this.ticket()!.title) {
      this.ticketService.update(this.ticket()!.id, { title: this.editTitle.trim() }).subscribe(updated => {
        this.ticket.set(updated);
      });
    }
    this.editingTitle.set(false);
    this.editTitle = '';
  }

  cancelEditTitle() {
    this.editingTitle.set(false);
    this.editTitle = '';
  }

  duplicateTicket() {
    if (this.ticket()) {
      this.ticketService.duplicate(this.ticket()!.id).subscribe(newTicket => {
        this.router.navigate(['/ticket', newTicket.id]);
      });
    }
  }

  toggleArchive() {
    if (this.ticket()) {
      const t = this.ticket()!;
      this.ticketService.update(t.id, { archived: !t.archived }).subscribe(updated => this.ticket.set(updated));
    }
  }

  deleteTicket() {
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
  }

  confirmDelete() {
    if (this.ticket()) {
      this.ticketService.delete(this.ticket()!.id).subscribe(() => {
        this.showDeleteModal.set(false);
        this.router.navigate(['/kanban']);
      });
    }
  }

  // Tasks
  addTask() {
    if (this.newTask.trim() && this.ticket()) {
      this.taskService.create(this.newTask.trim(), this.ticket()!.id).subscribe(() => {
        this.newTask = '';
        this.loadTasks();
      });
    }
  }

  toggleTask(task: Task) {
    this.taskService.update(task.id, { done: !task.done }).subscribe(() => this.loadTasks());
  }

  deleteTask(task: Task) {
    // Save for potential undo
    this.lastDeletedTask = {
      text: task.text,
      ticketId: this.ticket()!.id,
      done: task.done
    };

    this.taskService.delete(task.id).subscribe(() => {
      this.loadTasks();
      this.toast.info(`Tache "${task.text}" supprimee - Ctrl+Z pour annuler`);
    });
  }

  undoDeleteTask() {
    if (this.lastDeletedTask && this.ticket()) {
      this.taskService.create(this.lastDeletedTask.text, this.lastDeletedTask.ticketId).subscribe(newTask => {
        if (this.lastDeletedTask?.done) {
          this.taskService.update(newTask.id, { done: true }).subscribe(() => this.loadTasks());
        } else {
          this.loadTasks();
        }
        this.toast.success('Tache restauree');
        this.lastDeletedTask = null;
      });
    }
  }

  // Transformation methods
  convertTaskToTicket(task: Task) {
    if (confirm(`Convertir la tache "${task.text}" en ticket ?`)) {
      this.taskService.taskToTicket(task.id).subscribe({
        next: (newTicket) => {
          this.loadTasks();
          this.router.navigate(['/ticket', newTicket.id]);
        },
        error: () => alert('Erreur lors de la conversion')
      });
    }
  }

  convertTaskToProject(task: Task) {
    if (confirm(`Convertir la tache "${task.text}" en projet ?\nLes sous-taches deviendront des tickets.`)) {
      this.taskService.taskToProject(task.id).subscribe({
        next: () => {
          this.loadTasks();
          this.router.navigate(['/projects']);
        },
        error: () => alert('Erreur lors de la conversion')
      });
    }
  }

  showConvertToTask() {
    this.targetTicketId = 0;
    this.showConvertToTaskModal.set(true);
  }

  convertToTask() {
    if (!this.targetTicketId || !this.ticket()) return;

    if (confirm(`Convertir ce ticket en tache dans le ticket selectionne ?`)) {
      this.ticketService.ticketToTask(this.ticket()!.id, this.targetTicketId).subscribe({
        next: () => {
          this.showConvertToTaskModal.set(false);
          this.router.navigate(['/ticket', this.targetTicketId]);
        },
        error: () => alert('Erreur lors de la conversion')
      });
    }
  }

  convertToProject() {
    if (!this.ticket()) return;

    if (confirm(`Convertir le ticket "${this.ticket()!.title}" en projet ?\nLes taches deviendront des tickets.`)) {
      this.ticketService.ticketToProject(this.ticket()!.id).subscribe({
        next: (newProject) => {
          this.router.navigate(['/projects']);
        },
        error: () => alert('Erreur lors de la conversion')
      });
    }
  }

  toggleSubtasks(task: Task) {
    this.expandedTask.set(this.expandedTask() === task.id ? null : task.id);
  }

  addSubtask(parentTask: Task) {
    if (this.newSubtask.trim()) {
      this.taskService.createSubtask(this.newSubtask.trim(), parentTask.id).subscribe(() => {
        this.newSubtask = '';
        this.loadTasks();
      });
    }
  }

  doneCount() {
    return this.tasks().filter(t => t.done).length;
  }

  // Task Drag & Drop
  onTaskDragStart(event: DragEvent, task: Task, index: number) {
    this.draggedTaskId.set(task.id);
    this.draggedTaskIndex.set(index);
    event.dataTransfer?.setData('text/plain', task.id.toString());
  }

  onTaskDragEnd() {
    this.draggedTaskId.set(null);
    this.draggedTaskIndex.set(null);
    this.dragOverIndex.set(null);
  }

  onTaskDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (this.draggedTaskIndex() !== null && this.draggedTaskIndex() !== index) {
      this.dragOverIndex.set(index);
    }
  }

  onTaskDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    const dragIndex = this.draggedTaskIndex();

    if (dragIndex !== null && dragIndex !== dropIndex && this.ticket()) {
      const tasksCopy = [...this.tasks()];
      const [draggedTask] = tasksCopy.splice(dragIndex, 1);
      tasksCopy.splice(dropIndex, 0, draggedTask);

      // Update positions
      const taskIds = tasksCopy.map(t => t.id);
      this.ticketService.reorderTasks(this.ticket()!.id, taskIds).subscribe(() => {
        this.loadTasks();
      });
    }

    this.onTaskDragEnd();
  }

  // Labels
  availableLabels() {
    const ids = this.ticketLabels().map(l => l.id);
    return this.labels().filter(l => !ids.includes(l.id));
  }

  addLabel(event: Event) {
    const labelId = parseInt((event.target as HTMLSelectElement).value);
    if (labelId && this.ticket()) {
      this.ticketService.addLabelToTicket(this.ticket()!.id, labelId).subscribe(() => this.loadTicketLabels());
    }
    (event.target as HTMLSelectElement).value = '';
  }

  removeLabel(label: Label) {
    if (this.ticket()) {
      this.ticketService.removeLabelFromTicket(this.ticket()!.id, label.id).subscribe(() => this.loadTicketLabels());
    }
  }

  createAndAddLabel() {
    if (!this.newLabelName.trim() || !this.ticket()) return;

    // Get next default color (rotating through the palette)
    const color = this.defaultLabelColors[this.labelColorIndex % this.defaultLabelColors.length];
    this.labelColorIndex++;

    this.ticketService.createLabel(this.newLabelName.trim(), color).subscribe({
      next: (label) => {
        // Add the new label to the ticket
        this.ticketService.addLabelToTicket(this.ticket()!.id, label.id).subscribe(() => {
          this.loadLabels();
          this.loadTicketLabels();
        });
        this.newLabelName = '';
      },
      error: () => console.error('Erreur creation label')
    });
  }

  // Comments
  addComment() {
    if (this.newComment.trim() && this.ticket()) {
      this.ticketService.addComment(this.newComment.trim(), this.ticket()!.id).subscribe(() => {
        this.newComment = '';
        this.loadComments();
      });
    }
  }

  deleteComment(comment: Comment) {
    this.ticketService.deleteComment(comment.id).subscribe(() => this.loadComments());
  }

  // Reactions
  availableEmojis = ['👍', '❤️', '🎉', '🚀', '👀', '🤔'];
  emojiPickerOpen = signal<number | null>(null);

  toggleEmojiPicker(commentId: number) {
    this.emojiPickerOpen.set(this.emojiPickerOpen() === commentId ? null : commentId);
  }

  addReaction(comment: Comment, emoji: string) {
    this.ticketService.toggleReaction(comment.id, emoji).subscribe(() => {
      this.loadComments();
    });
    this.emojiPickerOpen.set(null);
  }

  hasReaction(comment: Comment, emoji: string): boolean {
    return comment.reactions?.some(r => r.emoji === emoji) ?? false;
  }

  // Time
  getRemaining(): number {
    const t = this.ticket();
    if (!t) return 0;
    return (t.time_estimated || 0) - (t.time_spent || 0);
  }

  getTimeProgress(): number {
    const t = this.ticket();
    if (!t || !t.time_estimated) return 0;
    return ((t.time_spent || 0) / t.time_estimated) * 100;
  }

  toggleTimer() {
    if (this.timerActive()) {
      this.timerActive.set(false);
      clearInterval(this.timerInterval);
    } else {
      this.timerActive.set(true);
      this.timerInterval = setInterval(() => this.timerSeconds.set(this.timerSeconds() + 1), 1000);
    }
  }

  resetTimer() {
    this.timerActive.set(false);
    this.timerSeconds.set(0);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  saveTimer() {
    if (this.ticket() && this.timerSeconds() > 0) {
      const minutes = Math.ceil(this.timerSeconds() / 60);
      this.ticketService.addTime(this.ticket()!.id, minutes).subscribe(updated => {
        this.ticket.set(updated);
        this.resetTimer();
      });
    }
  }

  addTimeManually() {
    if (this.ticket() && this.addMinutes > 0) {
      this.ticketService.addTime(this.ticket()!.id, this.addMinutes).subscribe(updated => {
        this.ticket.set(updated);
        this.addMinutes = 0;
      });
    }
  }

  formatTimer(): string {
    const h = Math.floor(this.timerSeconds() / 3600);
    const m = Math.floor((this.timerSeconds() % 3600) / 60);
    const s = this.timerSeconds() % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // Files
  triggerUpload() {
    document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
  }

  uploadFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && this.ticket()) {
      this.ticketService.uploadAttachment(this.ticket()!.id, file).subscribe(() => this.loadAttachments());
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDropFile(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && this.ticket()) {
      this.ticketService.uploadAttachment(this.ticket()!.id, file).subscribe(() => this.loadAttachments());
    }
  }

  deleteAttachment(attachment: Attachment) {
    this.ticketService.deleteAttachment(attachment.id).subscribe(() => this.loadAttachments());
  }

  getAttachmentUrl(attachment: Attachment) {
    return this.ticketService.getAttachmentUrl(attachment);
  }

  getFileIcon(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'fa-file-image';
    if (mimetype.startsWith('video/')) return 'fa-file-video';
    if (mimetype.includes('pdf')) return 'fa-file-pdf';
    if (mimetype.includes('word')) return 'fa-file-word';
    if (mimetype.includes('excel')) return 'fa-file-excel';
    if (mimetype.includes('zip')) return 'fa-file-archive';
    return 'fa-file';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Activity
  getActivityIcon(action: string): string {
    switch (action) {
      case 'created': return 'fa-plus';
      case 'updated': return 'fa-edit';
      case 'status_changed': return 'fa-exchange-alt';
      case 'priority_changed': return 'fa-flag';
      case 'archived': return 'fa-archive';
      default: return 'fa-circle';
    }
  }

  getActivityText(activity: Activity): string {
    switch (activity.action) {
      case 'created': return 'Ticket cree';
      case 'updated': return `${activity.field} modifie`;
      case 'status_changed': return `Statut: ${activity.old_value} -> ${activity.new_value}`;
      case 'priority_changed': return `Priorite: ${activity.old_value} -> ${activity.new_value}`;
      case 'archived': return 'Archive';
      default: return activity.action;
    }
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  // Projects
  loadProjects() {
    this.ticketService.getProjects().subscribe(data => this.projects.set(data));
  }

  // Pin/Favorites
  togglePin() {
    if (this.ticket()) {
      this.ticketService.togglePin(this.ticket()!.id).subscribe(updated => {
        this.ticket()!.pinned = updated.pinned;
      });
    }
  }

  // Dependencies
  loadDependencies(ticketId: number) {
    this.ticketService.getDependencies(ticketId).subscribe(data => this.dependencies.set(data));
  }

  loadAvailableTickets() {
    this.ticketService.getAll().subscribe(response => {
      const currentId = this.ticket()?.id;
      this.availableTickets.set(response.data.filter(t => t.id !== currentId && !t.archived));
    });
  }

  addDependency() {
    if (this.newDependencyId && this.ticket()) {
      this.ticketService.addDependency(this.ticket()!.id, parseInt(this.newDependencyId)).subscribe(() => {
        this.newDependencyId = '';
        this.loadDependencies(this.ticket()!.id);
      });
    }
  }

  removeDependency(depId: number, event: Event) {
    event.stopPropagation();
    if (this.ticket()) {
      this.ticketService.removeDependency(this.ticket()!.id, depId).subscribe(() => {
        this.loadDependencies(this.ticket()!.id);
      });
    }
  }

  openTicket(ticketId: number) {
    this.router.navigate(['/ticket', ticketId]);
  }
}
