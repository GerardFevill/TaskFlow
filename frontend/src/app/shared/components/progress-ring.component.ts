import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  templateUrl: './progress-ring.component.html',
  styleUrl: './progress-ring.component.scss'
})
export class ProgressRingComponent {
  // Inputs
  value = input<number>(0);
  max = input<number>(100);
  size = input<number>(100);
  strokeWidth = input<number>(8);
  color = input<string>('#6c5ce7');
  bgColor = input<string>('#6c5ce7');
  textColor = input<string>('#e8e8f0');
  labelColor = input<string>('#a0a0b0');
  showText = input<boolean>(true);
  showPercent = input<boolean>(true);
  label = input<string>('');

  // Computed values
  center = computed(() => this.size() / 2);
  radius = computed(() => (this.size() - this.strokeWidth()) / 2 - 2);
  circumference = computed(() => 2 * Math.PI * this.radius());

  percentage = computed(() => {
    const val = Math.min(Math.max(this.value(), 0), this.max());
    return this.max() > 0 ? (val / this.max()) * 100 : 0;
  });

  offset = computed(() => {
    return this.circumference() - (this.circumference() * this.percentage() / 100);
  });

  displayValue = computed(() => Math.round(this.percentage()));

  fontSize = computed(() => this.size() * 0.22);
}
