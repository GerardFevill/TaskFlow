import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { WhiteboardService } from '../../data/services/whiteboard.service';
import { TicketService } from '../../data/services/ticket.service';
import { ToastService } from '../../core/services/toast.service';
import { Whiteboard, WhiteboardElement, WhiteboardTool, WhiteboardElementType, STICKY_COLORS, SHAPE_COLORS } from '../../data/models/whiteboard.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whiteboard.component.html',
  styleUrl: './whiteboard.component.scss'
})
export class WhiteboardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private whiteboardService = inject(WhiteboardService);
  private ticketService = inject(TicketService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();
  private saveSubject = new Subject<void>();

  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  // State
  board = signal<Whiteboard | null>(null);
  elements = signal<WhiteboardElement[]>([]);
  projectName = signal('Project');
  projectId = signal<number>(0);

  // Viewport
  viewportX = signal(10000);
  viewportY = signal(10000);
  zoom = signal(1);

  // Tools & Interaction
  activeTool = signal<WhiteboardTool>('select');
  selectedIds = signal<number[]>([]);
  editingId = signal<number | null>(null);
  currentFillColor = signal('#fef3bd');
  currentStrokeColor = signal('#333333');

  // Interaction states
  isDragging = signal(false);
  isResizing = signal(false);
  isPanning = signal(false);
  isDrawing = signal(false);
  isSelecting = signal(false);

  // Drawing
  drawingPath = signal<string>('');
  drawingPoints: { x: number; y: number }[] = [];

  // Selection box
  selectionBox = signal<{ x: number; y: number; width: number; height: number } | null>(null);
  selectionStart: { x: number; y: number } | null = null;

  // Drag
  dragStart: { x: number; y: number } | null = null;
  dragStartElements: { id: number; x: number; y: number }[] = [];

  // Resize
  resizeHandle = '';
  resizeStartBounds: { x: number; y: number; width: number; height: number } | null = null;
  resizeStartPos: { x: number; y: number } | null = null;

  // Shape creation
  shapeStart: { x: number; y: number } | null = null;

  // Resize handles
  resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  // Computed
  canvasTransform = computed(() =>
    `translate(${this.viewportX()}px, ${this.viewportY()}px) scale(${this.zoom()})`
  );

  gridSize = computed(() => (this.board()?.grid_size || 20) * this.zoom());

  showColorPicker = computed(() => {
    const tool = this.activeTool();
    return tool === 'sticky_note' || tool === 'rectangle' || tool === 'circle' ||
           tool === 'triangle' || tool === 'diamond' || this.selectedIds().length > 0;
  });

  availableColors = computed(() => {
    const tool = this.activeTool();
    if (tool === 'sticky_note' || (this.selectedIds().length > 0 && this.getSelectedElements()[0]?.type === 'sticky_note')) {
      return STICKY_COLORS;
    }
    return SHAPE_COLORS;
  });

  // Element filters
  stickyElements = computed(() => this.elements().filter(e => e.type === 'sticky_note'));
  textElements = computed(() => this.elements().filter(e => e.type === 'text'));
  imageElements = computed(() => this.elements().filter(e => e.type === 'image'));
  rectElements = computed(() => this.elements().filter(e => e.type === 'rectangle'));
  circleElements = computed(() => this.elements().filter(e => e.type === 'circle'));
  triangleElements = computed(() => this.elements().filter(e => e.type === 'triangle'));
  diamondElements = computed(() => this.elements().filter(e => e.type === 'diamond'));
  lineElements = computed(() => this.elements().filter(e => e.type === 'line' || e.type === 'arrow'));
  freehandElements = computed(() => this.elements().filter(e => e.type === 'freehand'));

  ngOnInit() {
    // Load project and whiteboard
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const projectId = +params['projectId'];
      this.projectId.set(projectId);
      this.loadWhiteboard(projectId);
      this.loadProject(projectId);
    });

    // Auto-save with debounce
    this.saveSubject.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$)
    ).subscribe(() => this.saveChanges());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProject(projectId: number) {
    this.ticketService.getProject(projectId).subscribe({
      next: (project) => this.projectName.set(project.name),
      error: () => this.projectName.set('Project')
    });
  }

  loadWhiteboard(projectId: number) {
    this.whiteboardService.getProjectWhiteboard(projectId).subscribe({
      next: (board) => {
        this.board.set(board);
        if (board.viewport_x) this.viewportX.set(Number(board.viewport_x) + 10000);
        if (board.viewport_y) this.viewportY.set(Number(board.viewport_y) + 10000);
        if (board.viewport_zoom) this.zoom.set(Number(board.viewport_zoom));
        this.loadElements(board.id);
      },
      error: () => this.toast.error('Failed to load whiteboard')
    });
  }

  loadElements(boardId: number) {
    this.whiteboardService.getElements(boardId).subscribe({
      next: (elements) => {
        // Convert string values from PostgreSQL DECIMAL to numbers
        const parsed = elements.map(el => ({
          ...el,
          x: Number(el.x),
          y: Number(el.y),
          width: Number(el.width),
          height: Number(el.height),
          rotation: Number(el.rotation),
          stroke_width: Number(el.stroke_width),
          opacity: Number(el.opacity),
          z_index: Number(el.z_index)
        }));
        this.elements.set(parsed);
      },
      error: () => this.toast.error('Failed to load elements')
    });
  }

  // Tool selection
  setTool(tool: WhiteboardTool) {
    this.activeTool.set(tool);
    if (tool !== 'select') {
      this.selectedIds.set([]);
    }
  }

  // Viewport
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(this.zoom() * zoomFactor, 0.1), 5);

    const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const scale = newZoom / this.zoom();
    this.viewportX.set(mouseX - (mouseX - this.viewportX()) * scale);
    this.viewportY.set(mouseY - (mouseY - this.viewportY()) * scale);
    this.zoom.set(newZoom);

    this.triggerSave();
  }

  zoomIn() {
    this.zoom.set(Math.min(this.zoom() * 1.2, 5));
    this.triggerSave();
  }

  zoomOut() {
    this.zoom.set(Math.max(this.zoom() / 1.2, 0.1));
    this.triggerSave();
  }

  resetZoom() {
    this.zoom.set(1);
    this.viewportX.set(10000);
    this.viewportY.set(10000);
    this.triggerSave();
  }

  // Coordinate conversion
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.viewportX()) / this.zoom() + 10000,
      y: (screenY - rect.top - this.viewportY()) / this.zoom() + 10000
    };
  }

  // Canvas mouse events
  onCanvasMouseDown(event: MouseEvent) {
    if (event.target !== this.canvasContainer.nativeElement &&
        !(event.target as HTMLElement).classList.contains('canvas-grid')) {
      return;
    }

    const pos = this.screenToCanvas(event.clientX, event.clientY);

    // Middle mouse button or pan tool = pan
    if (event.button === 1 || this.activeTool() === 'pan') {
      this.isPanning.set(true);
      this.dragStart = { x: event.clientX - this.viewportX(), y: event.clientY - this.viewportY() };
      return;
    }

    // Space + left click = pan
    if (event.button === 0 && this.spacePressed) {
      this.isPanning.set(true);
      this.dragStart = { x: event.clientX - this.viewportX(), y: event.clientY - this.viewportY() };
      return;
    }

    // Select tool - start selection marquee
    if (this.activeTool() === 'select' && event.button === 0) {
      this.isSelecting.set(true);
      this.selectionStart = pos;
      this.selectedIds.set([]);
      return;
    }

    // Freehand drawing
    if (this.activeTool() === 'freehand' && event.button === 0) {
      this.isDrawing.set(true);
      this.drawingPoints = [pos];
      this.drawingPath.set(`M ${pos.x} ${pos.y}`);
      return;
    }

    // Shape creation
    const shapeTools: WhiteboardTool[] = ['sticky_note', 'text', 'rectangle', 'circle', 'triangle', 'diamond', 'line', 'arrow'];
    if (shapeTools.includes(this.activeTool()) && event.button === 0) {
      this.shapeStart = pos;
      this.isDrawing.set(true);
      return;
    }
  }

  onCanvasMouseMove(event: MouseEvent) {
    const pos = this.screenToCanvas(event.clientX, event.clientY);

    // Panning
    if (this.isPanning() && this.dragStart) {
      this.viewportX.set(event.clientX - this.dragStart.x);
      this.viewportY.set(event.clientY - this.dragStart.y);
      return;
    }

    // Selection marquee
    if (this.isSelecting() && this.selectionStart) {
      this.selectionBox.set({
        x: Math.min(this.selectionStart.x, pos.x),
        y: Math.min(this.selectionStart.y, pos.y),
        width: Math.abs(pos.x - this.selectionStart.x),
        height: Math.abs(pos.y - this.selectionStart.y)
      });
      return;
    }

    // Dragging elements
    if (this.isDragging() && this.dragStart) {
      const dx = (event.clientX - this.dragStart.x) / this.zoom();
      const dy = (event.clientY - this.dragStart.y) / this.zoom();

      const updated = this.elements().map(el => {
        const orig = this.dragStartElements.find(e => e.id === el.id);
        if (orig) {
          return { ...el, x: orig.x + dx, y: orig.y + dy };
        }
        return el;
      });
      this.elements.set(updated);
      return;
    }

    // Resizing
    if (this.isResizing() && this.resizeStartBounds && this.resizeStartPos) {
      const dx = (pos.x - this.resizeStartPos.x);
      const dy = (pos.y - this.resizeStartPos.y);
      let { x, y, width, height } = this.resizeStartBounds;

      switch (this.resizeHandle) {
        case 'se': width += dx; height += dy; break;
        case 'e': width += dx; break;
        case 's': height += dy; break;
        case 'nw': x += dx; y += dy; width -= dx; height -= dy; break;
        case 'ne': y += dy; width += dx; height -= dy; break;
        case 'sw': x += dx; width -= dx; height += dy; break;
        case 'n': y += dy; height -= dy; break;
        case 'w': x += dx; width -= dx; break;
      }

      width = Math.max(20, width);
      height = Math.max(20, height);

      const updated = this.elements().map(el => {
        if (this.selectedIds().includes(el.id)) {
          return { ...el, x, y, width, height };
        }
        return el;
      });
      this.elements.set(updated);
      return;
    }

    // Freehand drawing
    if (this.isDrawing() && this.activeTool() === 'freehand') {
      this.drawingPoints.push(pos);
      this.drawingPath.set(this.drawingPath() + ` L ${pos.x} ${pos.y}`);
      return;
    }
  }

  onCanvasMouseUp(event: MouseEvent) {
    const pos = this.screenToCanvas(event.clientX, event.clientY);

    // End panning
    if (this.isPanning()) {
      this.isPanning.set(false);
      this.dragStart = null;
      this.triggerSave();
      return;
    }

    // End selection
    if (this.isSelecting() && this.selectionBox()) {
      const box = this.selectionBox()!;
      const selected = this.elements().filter(el => this.intersectsBox(el, box)).map(el => el.id);
      this.selectedIds.set(selected);
      this.selectionBox.set(null);
      this.isSelecting.set(false);
      this.selectionStart = null;
      return;
    }

    // End dragging
    if (this.isDragging()) {
      this.isDragging.set(false);
      this.dragStart = null;
      this.dragStartElements = [];
      this.saveSelectedElements();
      return;
    }

    // End resizing
    if (this.isResizing()) {
      this.isResizing.set(false);
      this.resizeStartBounds = null;
      this.resizeStartPos = null;
      this.saveSelectedElements();
      return;
    }

    // End freehand drawing
    if (this.isDrawing() && this.activeTool() === 'freehand' && this.drawingPoints.length > 1) {
      this.createElement('freehand', {
        path_data: this.drawingPath(),
        stroke_color: this.currentStrokeColor(),
        x: Math.min(...this.drawingPoints.map(p => p.x)),
        y: Math.min(...this.drawingPoints.map(p => p.y)),
        width: Math.max(...this.drawingPoints.map(p => p.x)) - Math.min(...this.drawingPoints.map(p => p.x)),
        height: Math.max(...this.drawingPoints.map(p => p.y)) - Math.min(...this.drawingPoints.map(p => p.y))
      });
      this.drawingPoints = [];
      this.drawingPath.set('');
      this.isDrawing.set(false);
      return;
    }

    // Create shape
    if (this.isDrawing() && this.shapeStart) {
      const tool = this.activeTool();
      const start = this.shapeStart;
      let width = Math.abs(pos.x - start.x);
      let height = Math.abs(pos.y - start.y);
      const x = Math.min(start.x, pos.x);
      const y = Math.min(start.y, pos.y);

      // If just a click (no drag), use default size
      if (width < 10 && height < 10) {
        width = tool === 'sticky_note' ? 200 : tool === 'text' ? 150 : 100;
        height = tool === 'sticky_note' ? 150 : tool === 'text' ? 30 : 100;
      }

      const typeMap: Record<string, WhiteboardElementType> = {
        'sticky_note': 'sticky_note',
        'text': 'text',
        'rectangle': 'rectangle',
        'circle': 'circle',
        'triangle': 'triangle',
        'diamond': 'diamond',
        'line': 'line',
        'arrow': 'arrow'
      };

      this.createElement(typeMap[tool] || 'rectangle', {
        x: tool === 'sticky_note' || tool === 'text' ? start.x : x,
        y: tool === 'sticky_note' || tool === 'text' ? start.y : y,
        width,
        height,
        fill_color: this.currentFillColor(),
        stroke_color: this.currentStrokeColor(),
        end_arrow: tool === 'arrow'
      });

      this.shapeStart = null;
      this.isDrawing.set(false);
      return;
    }

    this.isDrawing.set(false);
  }

  // Element interaction
  onElementMouseDown(event: MouseEvent, element: WhiteboardElement) {
    event.stopPropagation();

    if (element.locked) return;

    // Select element
    if (event.ctrlKey || event.metaKey) {
      const current = this.selectedIds();
      if (current.includes(element.id)) {
        this.selectedIds.set(current.filter(id => id !== element.id));
      } else {
        this.selectedIds.set([...current, element.id]);
      }
    } else if (!this.selectedIds().includes(element.id)) {
      this.selectedIds.set([element.id]);
    }

    // Start dragging
    this.isDragging.set(true);
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.dragStartElements = this.getSelectedElements().map(el => ({
      id: el.id,
      x: el.x,
      y: el.y
    }));
  }

  onElementDblClick(element: WhiteboardElement) {
    if (element.type === 'sticky_note' || element.type === 'text') {
      this.editingId.set(element.id);
      setTimeout(() => {
        const input = document.querySelector('.editing') as HTMLElement;
        if (input) input.focus();
      }, 0);
    }
  }

  onTextBlur(event: Event, element: WhiteboardElement) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const newText = target.value;

    if (newText !== element.text_content) {
      const updated = this.elements().map(el =>
        el.id === element.id ? { ...el, text_content: newText } : el
      );
      this.elements.set(updated);
      this.saveElement(element.id, { text_content: newText });
    }

    this.editingId.set(null);
  }

  cancelEditing() {
    this.editingId.set(null);
  }

  // Resize handles
  onResizeStart(event: MouseEvent, handle: string) {
    event.stopPropagation();
    if (this.selectedIds().length !== 1) return;

    const elem = this.getSelectedElements()[0];
    this.isResizing.set(true);
    this.resizeHandle = handle;
    this.resizeStartBounds = { x: elem.x, y: elem.y, width: elem.width, height: elem.height };
    this.resizeStartPos = this.screenToCanvas(event.clientX, event.clientY);
  }

  getHandlePosition(handle: string): { x: number; y: number } {
    if (this.selectedIds().length !== 1) return { x: 0, y: 0 };
    const elem = this.getSelectedElements()[0];

    const positions: Record<string, { x: number; y: number }> = {
      'nw': { x: elem.x, y: elem.y },
      'n': { x: elem.x + elem.width / 2, y: elem.y },
      'ne': { x: elem.x + elem.width, y: elem.y },
      'e': { x: elem.x + elem.width, y: elem.y + elem.height / 2 },
      'se': { x: elem.x + elem.width, y: elem.y + elem.height },
      's': { x: elem.x + elem.width / 2, y: elem.y + elem.height },
      'sw': { x: elem.x, y: elem.y + elem.height },
      'w': { x: elem.x, y: elem.y + elem.height / 2 }
    };

    return positions[handle] || { x: 0, y: 0 };
  }

  // Helper functions
  getSelectedElements(): WhiteboardElement[] {
    return this.elements().filter(el => this.selectedIds().includes(el.id));
  }

  intersectsBox(elem: WhiteboardElement, box: { x: number; y: number; width: number; height: number }): boolean {
    return !(elem.x + elem.width < box.x ||
             elem.x > box.x + box.width ||
             elem.y + elem.height < box.y ||
             elem.y > box.y + box.height);
  }

  getTrianglePoints(elem: WhiteboardElement): string {
    return `${elem.x + elem.width / 2},${elem.y} ${elem.x + elem.width},${elem.y + elem.height} ${elem.x},${elem.y + elem.height}`;
  }

  getDiamondPoints(elem: WhiteboardElement): string {
    return `${elem.x + elem.width / 2},${elem.y} ${elem.x + elem.width},${elem.y + elem.height / 2} ${elem.x + elem.width / 2},${elem.y + elem.height} ${elem.x},${elem.y + elem.height / 2}`;
  }

  getImageUrl(elem: WhiteboardElement): string {
    if (elem.image_url?.startsWith('/')) {
      return `${environment.uploadsUrl.replace('/uploads', '')}${elem.image_url}`;
    }
    return elem.image_url || '';
  }

  // CRUD operations
  createElement(type: WhiteboardElementType, props: Partial<WhiteboardElement>) {
    if (!this.board()) return;

    const newElement: Partial<WhiteboardElement> = {
      type,
      x: props.x || 100,
      y: props.y || 100,
      width: props.width || 200,
      height: props.height || 100,
      fill_color: props.fill_color || this.currentFillColor(),
      stroke_color: props.stroke_color || this.currentStrokeColor(),
      ...props
    };

    this.whiteboardService.createElement(this.board()!.id, newElement).subscribe({
      next: (elem) => {
        this.elements.set([...this.elements(), elem]);
        this.selectedIds.set([elem.id]);
        if (type === 'sticky_note' || type === 'text') {
          this.editingId.set(elem.id);
          setTimeout(() => {
            const input = document.querySelector('.editing') as HTMLElement;
            if (input) input.focus();
          }, 0);
        }
      },
      error: () => this.toast.error('Failed to create element')
    });
  }

  saveElement(id: number, data: Partial<WhiteboardElement>) {
    if (!this.board()) return;
    this.whiteboardService.updateElement(this.board()!.id, id, data).subscribe({
      error: () => this.toast.error('Failed to save element')
    });
  }

  saveSelectedElements() {
    if (!this.board()) return;
    const selected = this.getSelectedElements();
    if (selected.length === 0) return;

    const updates = selected.map(el => ({
      id: el.id,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height
    }));

    this.whiteboardService.bulkUpdateElements(this.board()!.id, updates).subscribe({
      error: () => this.toast.error('Failed to save elements')
    });
  }

  deleteSelected() {
    if (!this.board() || this.selectedIds().length === 0) return;

    this.whiteboardService.bulkDeleteElements(this.board()!.id, this.selectedIds()).subscribe({
      next: () => {
        this.elements.set(this.elements().filter(el => !this.selectedIds().includes(el.id)));
        this.selectedIds.set([]);
      },
      error: () => this.toast.error('Failed to delete elements')
    });
  }

  // Color
  setFillColor(color: string) {
    this.currentFillColor.set(color);

    // Apply to selected elements
    if (this.selectedIds().length > 0) {
      const updated = this.elements().map(el =>
        this.selectedIds().includes(el.id) ? { ...el, fill_color: color } : el
      );
      this.elements.set(updated);

      this.selectedIds().forEach(id => {
        this.saveElement(id, { fill_color: color });
      });
    }
  }

  // Image upload
  triggerImageUpload() {
    this.imageInput.nativeElement.click();
  }

  onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.board()) return;

    this.whiteboardService.uploadImage(this.board()!.id, file).subscribe({
      next: (elem) => {
        this.elements.set([...this.elements(), elem]);
        this.selectedIds.set([elem.id]);
        this.toast.success('Image uploaded');
      },
      error: () => this.toast.error('Failed to upload image')
    });

    input.value = '';
  }

  // Save
  triggerSave() {
    this.saveSubject.next();
  }

  saveChanges() {
    if (!this.board()) return;
    this.whiteboardService.updateWhiteboard(this.board()!.id, {
      viewport_x: this.viewportX() - 10000,
      viewport_y: this.viewportY() - 10000,
      viewport_zoom: this.zoom()
    }).subscribe();
  }

  // Navigation
  goBack() {
    this.router.navigate(['/projects', this.projectId()]);
  }

  // Keyboard
  private spacePressed = false;

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Ignore if editing text
    if (this.editingId()) return;

    // Space for pan
    if (event.code === 'Space' && !this.spacePressed) {
      this.spacePressed = true;
      event.preventDefault();
      return;
    }

    // Tool shortcuts
    switch (event.key.toLowerCase()) {
      case 'v': this.setTool('select'); break;
      case 'h': this.setTool('pan'); break;
      case 'n': this.setTool('sticky_note'); break;
      case 't': this.setTool('text'); break;
      case 'r': this.setTool('rectangle'); break;
      case 'o': this.setTool('circle'); break;
      case 'l': this.setTool('line'); break;
      case 'a': this.setTool('arrow'); break;
      case 'p': this.setTool('freehand'); break;
      case 'escape':
        this.selectedIds.set([]);
        this.setTool('select');
        break;
      case 'delete':
      case 'backspace':
        if (this.selectedIds().length > 0) {
          event.preventDefault();
          this.deleteSelected();
        }
        break;
    }

    // Ctrl+A: Select all
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      this.selectedIds.set(this.elements().map(el => el.id));
    }
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') {
      this.spacePressed = false;
    }
  }
}
