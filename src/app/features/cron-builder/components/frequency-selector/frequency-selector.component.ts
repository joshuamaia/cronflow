import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FREQUENCY_OPTIONS, type Frequency } from '../../../../core/models/cron-config.model';

@Component({
  selector: 'app-frequency-selector',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="options" role="radiogroup" aria-label="Frequência">
      @for (option of options; track option.value) {
        <button
          type="button"
          role="radio"
          class="option"
          [class.selected]="option.value === value()"
          [attr.aria-checked]="option.value === value()"
          (click)="valueChange.emit(option.value)"
        >
          <mat-icon>{{ option.icon }}</mat-icon>
          <span class="text">
            <span class="label">{{ option.label }}</span>
            <span class="hint">{{ option.hint }}</span>
          </span>
        </button>
      }
    </div>
  `,
  styleUrl: './frequency-selector.component.scss',
})
export class FrequencySelectorComponent {
  readonly value = input.required<Frequency>();
  readonly valueChange = output<Frequency>();

  protected readonly options = FREQUENCY_OPTIONS;
}
