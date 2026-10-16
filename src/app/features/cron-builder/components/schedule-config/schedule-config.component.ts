import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import {
  HOUR_INTERVALS,
  MINUTE_INTERVALS,
  SECOND_INTERVALS,
  WEEK_DAYS,
  type CronConfig,
  type WeekDay,
} from '../../../../core/models/cron-config.model';
import type { ScheduleForm } from '../../cron-builder.forms';

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);

@Component({
  selector: 'app-schedule-config',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './schedule-config.component.html',
  styleUrl: './schedule-config.component.scss',
})
export class ScheduleConfigComponent {
  readonly form = input.required<ScheduleForm>();
  readonly config = input.required<CronConfig>();

  protected readonly weekDays = WEEK_DAYS;
  protected readonly hours = range(0, 23);
  protected readonly minutes = range(0, 59);
  protected readonly daysOfMonth = range(1, 31);
  protected readonly noWeekDays = computed(() => this.config().weekDays.length === 0);
  protected readonly dayMayNotExist = computed(() => this.config().dayOfMonth > 28);

  /** Campo de intervalo da modalidade atual, ou `null` para modalidades com horário fixo. */
  protected readonly intervalField = computed((): IntervalField | null => {
    const config = this.config();
    const pad = (value: number) => String(value).padStart(2, '0');
    const anchors = (step: number, format: (value: number) => string) =>
      [0, step, step * 2].map(format).join(', ');

    switch (config.frequency) {
      case 'seconds':
        return {
          values: SECOND_INTERVALS,
          control: 'secondInterval',
          current: config.secondInterval,
          unit: 's',
          anchors: anchors(config.secondInterval, (value) => `hh:mm:${pad(value)}`),
        };
      case 'minutes':
        return {
          values: MINUTE_INTERVALS,
          control: 'minuteInterval',
          current: config.minuteInterval,
          unit: 'min',
          anchors: anchors(config.minuteInterval, (value) => `hh:${pad(value)}:00`),
        };
      case 'hours':
        return {
          values: HOUR_INTERVALS,
          control: 'hourInterval',
          current: config.hourInterval,
          unit: 'h',
          anchors: anchors(config.hourInterval, (value) => `${pad(value)}:00:00`),
        };
      default:
        return null;
    }
  });

  protected pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  protected isDaySelected(day: WeekDay): boolean {
    return this.config().weekDays.includes(day);
  }

  protected toggleDay(day: WeekDay): void {
    const control = this.form().controls.weekDays;
    const current = control.value;
    const next = current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day].sort((a, b) => a - b);
    control.setValue(next);
    control.markAsTouched();
  }

  protected selectInterval(controlName: IntervalControl, value: number): void {
    this.form().controls[controlName].setValue(value);
  }
}

type IntervalControl = 'secondInterval' | 'minuteInterval' | 'hourInterval';

interface IntervalField {
  values: readonly number[];
  control: IntervalControl;
  current: number;
  unit: string;
  anchors: string;
}
