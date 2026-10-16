import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { SimulationState } from '../../../../core/models/simulation-result.model';

export interface TimelineItem {
  position: number;
  iso: string;
  day: string;
  month: string;
  weekday: string;
  date: string;
  time: string;
}

const dayFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function toTimelineItem(epochMs: number, index: number): TimelineItem {
  const date = new Date(epochMs);
  return {
    position: index + 1,
    iso: date.toISOString(),
    day: dayFormat.format(date),
    month: monthFormat.format(date),
    weekday: capitalize(weekdayFormat.format(date)),
    date: dateFormat.format(date),
    time: timeFormat.format(date),
  };
}

@Component({
  selector: 'app-execution-timeline',
  imports: [MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-timeline.component.html',
  styleUrl: './execution-timeline.component.scss',
})
export class ExecutionTimelineComponent {
  readonly state = input.required<SimulationState>();
  readonly limit = input.required<number>();

  /** Só formata o que será renderizado: no máximo o limite solicitado (≤ 20). */
  protected readonly items = computed(() => {
    const state = this.state();
    return state.status === 'done' ? state.executions.map(toTimelineItem) : [];
  });

  protected readonly message = computed(() => {
    const state = this.state();
    return 'message' in state ? state.message : '';
  });

  protected readonly placeholders = computed(() => Array.from({ length: Math.min(this.limit(), 5) }));
}
