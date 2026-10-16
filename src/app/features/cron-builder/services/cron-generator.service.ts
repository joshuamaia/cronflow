import { Injectable } from '@angular/core';
import {
  HOUR_INTERVALS,
  MINUTE_INTERVALS,
  SECOND_INTERVALS,
  WEEK_DAYS,
  type CronConfig,
  type WeekDay,
} from '../../../core/models/cron-config.model';

export type CronGenerationResult =
  | { valid: true; expression: string }
  | { valid: false; errors: string[] };

const isIntegerInRange = (value: unknown, min: number, max: number): boolean =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

const TIME_BASED = new Set(['daily', 'weekly', 'monthly']);

/**
 * Converte a configuração visual em uma expressão Spring CRON de seis campos:
 * `segundo minuto hora dia-do-mês mês dia-da-semana`.
 */
@Injectable({ providedIn: 'root' })
export class CronGeneratorService {
  generate(config: CronConfig): CronGenerationResult {
    const errors = this.validate(config);
    if (errors.length > 0) return { valid: false, errors };

    const { second, minute, hour } = config;
    switch (config.frequency) {
      case 'daily':
        return ok(`${second} ${minute} ${hour} * * *`);
      case 'weekly':
        return ok(`${second} ${minute} ${hour} * * ${formatWeekDays(config.weekDays)}`);
      case 'monthly':
        return ok(`${second} ${minute} ${hour} ${config.dayOfMonth} * *`);
      case 'seconds':
        return ok(`${step(config.secondInterval)} * * * * *`);
      case 'minutes':
        return ok(`0 ${step(config.minuteInterval)} * * * *`);
      case 'hours':
        return ok(`0 0 ${step(config.hourInterval)} * * *`);
    }
  }

  validate(config: CronConfig): string[] {
    const errors: string[] = [];

    if (TIME_BASED.has(config.frequency)) {
      if (!isIntegerInRange(config.hour, 0, 23)) errors.push('A hora deve estar entre 0 e 23.');
      if (!isIntegerInRange(config.minute, 0, 59)) errors.push('O minuto deve estar entre 0 e 59.');
      if (!isIntegerInRange(config.second, 0, 59)) errors.push('O segundo deve estar entre 0 e 59.');
    }

    switch (config.frequency) {
      case 'weekly': {
        const days = config.weekDays ?? [];
        if (days.length === 0) errors.push('Selecione pelo menos um dia da semana.');
        else if (!days.every((day) => isIntegerInRange(day, 0, 6))) {
          errors.push('Dia da semana inválido.');
        }
        break;
      }
      case 'monthly':
        if (!isIntegerInRange(config.dayOfMonth, 1, 31)) {
          errors.push('O dia do mês deve estar entre 1 e 31.');
        }
        break;
      case 'seconds':
        if (!SECOND_INTERVALS.includes(config.secondInterval)) {
          errors.push('Intervalo de segundos não suportado.');
        }
        break;
      case 'minutes':
        if (!MINUTE_INTERVALS.includes(config.minuteInterval)) {
          errors.push('Intervalo de minutos não suportado.');
        }
        break;
      case 'hours':
        if (!HOUR_INTERVALS.includes(config.hourInterval)) {
          errors.push('Intervalo de horas não suportado.');
        }
        break;
      case 'daily':
        break;
      default:
        errors.push('Selecione uma frequência válida.');
    }
    return errors;
  }
}

function ok(expression: string): CronGenerationResult {
  return { valid: true, expression };
}

/** `*` para intervalo 1 e `*` + `/N` nos demais: alinhado ao relógio, como no Spring. */
function step(interval: number): string {
  return interval === 1 ? '*' : `*/${interval}`;
}

/**
 * Todos os dias → `*`; um bloco contínuo de 3 ou mais dias → intervalo (`MON-FRI`);
 * demais casos → lista (`MON,WED,FRI`).
 */
export function formatWeekDays(days: readonly WeekDay[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return '*';

  const token = (day: WeekDay) => WEEK_DAYS[day].token;
  const contiguous = sorted.every((day, index) => index === 0 || day === sorted[index - 1] + 1);
  if (contiguous && sorted.length >= 3) {
    return `${token(sorted[0])}-${token(sorted[sorted.length - 1])}`;
  }
  return sorted.map(token).join(',');
}
