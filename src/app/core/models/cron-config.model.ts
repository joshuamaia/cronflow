/** Modalidades de agendamento suportadas pelo construtor visual. */
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'seconds' | 'minutes' | 'hours';

/** Dia da semana no padrão Spring/croner: 0 = domingo … 6 = sábado. */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CronConfig {
  frequency: Frequency;
  hour: number;
  minute: number;
  second: number;
  weekDays: WeekDay[];
  dayOfMonth: number;
  secondInterval: number;
  minuteInterval: number;
  hourInterval: number;
}

export interface FrequencyOption {
  value: Frequency;
  label: string;
  hint: string;
  icon: string;
}

export interface WeekDayOption {
  value: WeekDay;
  /** Abreviação Spring utilizada na expressão (SUN, MON…). */
  token: string;
  short: string;
  name: string;
}

export const FREQUENCY_OPTIONS: readonly FrequencyOption[] = [
  { value: 'daily', label: 'Diariamente', hint: 'Todo dia, no mesmo horário', icon: 'today' },
  { value: 'weekly', label: 'Semanalmente', hint: 'Em dias da semana escolhidos', icon: 'date_range' },
  { value: 'monthly', label: 'Mensalmente', hint: 'Em um dia fixo do mês', icon: 'calendar_month' },
  { value: 'minutes', label: 'A cada X minutos', hint: 'Intervalo em minutos', icon: 'timer' },
  { value: 'hours', label: 'A cada X horas', hint: 'Intervalo em horas', icon: 'schedule' },
  { value: 'seconds', label: 'A cada X segundos', hint: 'Alta frequência', icon: 'bolt' },
];

export const WEEK_DAYS: readonly WeekDayOption[] = [
  { value: 0, token: 'SUN', short: 'Dom', name: 'domingo' },
  { value: 1, token: 'MON', short: 'Seg', name: 'segunda-feira' },
  { value: 2, token: 'TUE', short: 'Ter', name: 'terça-feira' },
  { value: 3, token: 'WED', short: 'Qua', name: 'quarta-feira' },
  { value: 4, token: 'THU', short: 'Qui', name: 'quinta-feira' },
  { value: 5, token: 'FRI', short: 'Sex', name: 'sexta-feira' },
  { value: 6, token: 'SAT', short: 'Sáb', name: 'sábado' },
];

export const SECOND_INTERVALS: readonly number[] = [1, 2, 5, 10, 15, 20, 30];
export const MINUTE_INTERVALS: readonly number[] = [1, 2, 5, 10, 15, 20, 30];
export const HOUR_INTERVALS: readonly number[] = [1, 2, 3, 4, 6, 8, 12];

export const DEFAULT_CRON_CONFIG: CronConfig = {
  frequency: 'daily',
  hour: 8,
  minute: 30,
  second: 0,
  weekDays: [1, 2, 3, 4, 5],
  dayOfMonth: 10,
  secondInterval: 5,
  minuteInterval: 15,
  hourInterval: 2,
};
