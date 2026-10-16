import { Injectable } from '@angular/core';
import { WEEK_DAYS, type WeekDayOption } from '../../../core/models/cron-config.model';

const NUMBER = /^\d{1,2}$/;
const STEP = /^\*\/(\d{1,2})$/;
const DAY_RANGE = /^([A-Za-z]{3})-([A-Za-z]{3})$/;

/**
 * Descreve em português a expressão gerada. A descrição é derivada da própria expressão
 * (e não da configuração visual), garantindo que ambas correspondam exatamente.
 * Retorna `null` para formatos fora do subconjunto produzido pelo construtor.
 */
@Injectable({ providedIn: 'root' })
export class CronDescriptionService {
  describe(expression: string): string | null {
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 6) return null;
    const [second, minute, hour, dayOfMonth, month, dayOfWeek] = fields;
    if (month !== '*') return null;

    const anyDay = dayOfMonth === '*' && dayOfWeek === '*';

    // Intervalos: o campo do intervalo é `*` ou `*/N`, os maiores são `*` e os menores ficam em 0.
    if (anyDay) {
      const interval =
        (hour === '*' && minute === '*' ? describeInterval(second, 'segundo', 'segundos') : null) ??
        (hour === '*' && second === '0' ? describeInterval(minute, 'minuto', 'minutos') : null) ??
        (minute === '0' && second === '0' ? describeInterval(hour, 'hora', 'horas') : null);
      if (interval) return interval;
    }

    if (![second, minute, hour].every((field) => NUMBER.test(field))) return null;
    const time = formatTime(Number(hour), Number(minute), Number(second));

    if (anyDay) return `Executar todos os dias às ${time}`;

    if (dayOfWeek === '*' && NUMBER.test(dayOfMonth)) {
      return `Executar no dia ${Number(dayOfMonth)} de cada mês às ${time}`;
    }

    if (dayOfMonth === '*') {
      const days = describeWeekDays(dayOfWeek);
      if (days) return `Executar ${days} às ${time}`;
    }
    return null;
  }
}

function describeInterval(field: string, singular: string, plural: string): string | null {
  if (field === '*') return `Executar a cada ${singular}`;
  const match = STEP.exec(field);
  return match ? `Executar a cada ${Number(match[1])} ${plural}` : null;
}

/** Formata horários como 08h, 08h30 ou 08h30min15s. */
export function formatTime(hour: number, minute: number, second: number): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  if (second !== 0) return `${pad(hour)}h${pad(minute)}min${pad(second)}s`;
  if (minute !== 0) return `${pad(hour)}h${pad(minute)}`;
  return `${pad(hour)}h`;
}

function findDay(token: string): WeekDayOption | undefined {
  return WEEK_DAYS.find((day) => day.token === token.toUpperCase());
}

function joinList(items: string[]): string {
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function describeWeekDays(field: string): string | null {
  const range = DAY_RANGE.exec(field);
  if (range) {
    const start = findDay(range[1]);
    const end = findDay(range[2]);
    return start && end ? `de ${start.name.replace('-feira', '')} a ${end.name}` : null;
  }

  const days = field.split(',').map(findDay);
  if (days.some((day) => day === undefined)) return null;
  const known = days as WeekDayOption[];

  if (known.length === 1) {
    const [day] = known;
    const article = day.value === 0 || day.value === 6 ? 'todo' : 'toda';
    return `${article} ${day.name}`;
  }
  return `nos dias ${joinList(known.map((day) => day.name))},`;
}
