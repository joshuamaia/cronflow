import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  getLocalTimeZone,
  MAX_SUPPORTED_DATE,
  MIN_SUPPORTED_DATE,
} from '../../../../core/date/simulation-period';
import { RESULT_LIMIT_OPTIONS } from '../../../../core/models/simulation-request.model';
import type { PeriodForm } from '../../cron-builder.forms';

@Component({
  selector: 'app-simulation-period',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './simulation-period.component.html',
  styleUrl: './simulation-period.component.scss',
})
export class SimulationPeriodComponent {
  readonly form = input.required<PeriodForm>();
  /** Data inicial atual, usada como mínimo da data final. */
  readonly start = input<Date | null>(null);
  readonly error = input<string | null>(null);

  protected readonly minDate = MIN_SUPPORTED_DATE;
  protected readonly maxDate = MAX_SUPPORTED_DATE;
  protected readonly limits = RESULT_LIMIT_OPTIONS;
  protected readonly timeZone = getLocalTimeZone();
}
