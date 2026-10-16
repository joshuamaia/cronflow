import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { map } from 'rxjs';
import {
  addDays,
  DEFAULT_PERIOD_DAYS,
  resolvePeriod,
  startOfDay,
} from '../../core/date/simulation-period';
import {
  DEFAULT_CRON_CONFIG,
  type CronConfig,
  type Frequency,
} from '../../core/models/cron-config.model';
import {
  DEFAULT_RESULT_LIMIT,
  type ResultLimit,
} from '../../core/models/simulation-request.model';
import { CronExamplesComponent } from './components/cron-examples/cron-examples.component';
import { CronResultComponent } from './components/cron-result/cron-result.component';
import { ExecutionTimelineComponent } from './components/execution-timeline/execution-timeline.component';
import { FrequencySelectorComponent } from './components/frequency-selector/frequency-selector.component';
import { ScheduleConfigComponent } from './components/schedule-config/schedule-config.component';
import { SimulationPeriodComponent } from './components/simulation-period/simulation-period.component';
import { SavedExamplesComponent } from './components/saved-examples/saved-examples.component';
import { createScheduleForm, type PeriodForm, type ScheduleForm } from './cron-builder.forms';
import { CronDescriptionService } from './services/cron-description.service';
import { CronGeneratorService } from './services/cron-generator.service';
import {
  CronSimulatorService,
  sameSimulationInput,
  type SimulationInput,
} from './services/cron-simulator.service';

@Component({
  selector: 'app-cron-builder',
  imports: [
    CronExamplesComponent,
    SavedExamplesComponent,
    FrequencySelectorComponent,
    ScheduleConfigComponent,
    SimulationPeriodComponent,
    CronResultComponent,
    ExecutionTimelineComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cron-builder.component.html',
  styleUrl: './cron-builder.component.scss',
})
export class CronBuilderComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly generator = inject(CronGeneratorService);
  private readonly describer = inject(CronDescriptionService);
  private readonly simulator = inject(CronSimulatorService);

  readonly scheduleForm: ScheduleForm = createScheduleForm(inject(FormBuilder), DEFAULT_CRON_CONFIG);

  readonly periodForm: PeriodForm = (() => {
    const today = startOfDay(new Date());
    return this.fb.group({
      start: this.fb.control<Date | null>(today),
      end: this.fb.control<Date | null>(addDays(today, DEFAULT_PERIOD_DAYS)),
      limit: this.fb.control<ResultLimit>(DEFAULT_RESULT_LIMIT),
    });
  })();

  // Estado do construtor como Signals (derivados dos formulários reativos).
  readonly config = toSignal(
    this.scheduleForm.valueChanges.pipe(map(() => this.scheduleForm.getRawValue())),
    { initialValue: this.scheduleForm.getRawValue() },
  );
  readonly periodValue = toSignal(
    this.periodForm.valueChanges.pipe(map(() => this.periodForm.getRawValue())),
    { initialValue: this.periodForm.getRawValue() },
  );

  readonly frequency = computed(() => this.config().frequency);
  readonly limit = computed(() => this.periodValue().limit);

  // Estados derivados síncronos: baratos, sem simulação dentro de `computed()`.
  readonly generation = computed(() => this.generator.generate(this.config()));
  readonly expression = computed(() => {
    const generation = this.generation();
    return generation.valid ? generation.expression : null;
  });
  readonly description = computed(() => {
    const expression = this.expression();
    return expression ? this.describer.describe(expression) : null;
  });
  readonly period = computed(() => {
    const { start, end } = this.periodValue();
    return resolvePeriod(start, end);
  });
  readonly periodError = computed(() => {
    const period = this.period();
    return period.valid ? null : period.message;
  });

  readonly configStepTitle = computed(() => {
    switch (this.frequency()) {
      case 'weekly':
        return 'Em quais dias e horário?';
      case 'monthly':
        return 'Em qual dia do mês e horário?';
      case 'daily':
        return 'Defina o horário';
      default:
        return 'Defina o intervalo';
    }
  });

  /** Entrada da simulação; `equal` evita reprocessar quando nada relevante mudou. */
  readonly simulationInput = computed<SimulationInput>(
    () => {
      const generation = this.generation();
      if (!generation.valid) return { kind: 'invalid', message: generation.errors[0] };

      const { start, end } = this.periodValue();
      if (start === null || end === null) return { kind: 'waiting' };

      const period = this.period();
      if (!period.valid) return { kind: 'invalid', message: period.message };

      return {
        kind: 'ready',
        request: {
          expression: generation.expression,
          startMs: period.startMs,
          endMs: period.endMs,
          limit: this.limit(),
        },
      };
    },
    { equal: sameSimulationInput },
  );

  /** Estado assíncrono, atualizado pelas respostas do Web Worker. */
  readonly simulation = this.simulator.connect(this.simulationInput);

  setFrequency(frequency: Frequency): void {
    this.scheduleForm.controls.frequency.setValue(frequency);
  }

  /** Aplica um exemplo (pré-configurado ou criado pelo usuário) ao construtor. */
  applyConfig(partial: Partial<CronConfig>): void {
    const config: CronConfig = { ...this.scheduleForm.getRawValue(), ...partial };
    this.scheduleForm.setValue({ ...config, weekDays: [...config.weekDays] });
  }
}
