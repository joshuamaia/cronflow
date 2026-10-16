import { Validators, type FormBuilder, type FormControl, type FormGroup } from '@angular/forms';
import type { CronConfig, Frequency, WeekDay } from '../../core/models/cron-config.model';
import type { ResultLimit } from '../../core/models/simulation-request.model';

/** Formulário tipado do construtor (espelha `CronConfig`). */
export type ScheduleForm = FormGroup<{
  frequency: FormControl<Frequency>;
  hour: FormControl<number>;
  minute: FormControl<number>;
  second: FormControl<number>;
  weekDays: FormControl<WeekDay[]>;
  dayOfMonth: FormControl<number>;
  secondInterval: FormControl<number>;
  minuteInterval: FormControl<number>;
  hourInterval: FormControl<number>;
}>;

/** Formulário do período de simulação (não altera a expressão CRON). */
export type PeriodForm = FormGroup<{
  start: FormControl<Date | null>;
  end: FormControl<Date | null>;
  limit: FormControl<ResultLimit>;
}>;

/** Cria o formulário do agendamento; usado pelo construtor e pelo editor de exemplos. */
export function createScheduleForm(fb: FormBuilder, config: CronConfig): ScheduleForm {
  const nn = fb.nonNullable;
  return nn.group({
    frequency: nn.control<Frequency>(config.frequency),
    hour: nn.control(config.hour, [Validators.min(0), Validators.max(23)]),
    minute: nn.control(config.minute, [Validators.min(0), Validators.max(59)]),
    second: nn.control(config.second, [Validators.min(0), Validators.max(59)]),
    weekDays: nn.control<WeekDay[]>([...config.weekDays], Validators.required),
    dayOfMonth: nn.control(config.dayOfMonth, [Validators.min(1), Validators.max(31)]),
    secondInterval: nn.control(config.secondInterval),
    minuteInterval: nn.control(config.minuteInterval),
    hourInterval: nn.control(config.hourInterval),
  });
}
