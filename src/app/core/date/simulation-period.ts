import { MAX_SUPPORTED_DATE_MS, MIN_SUPPORTED_DATE_MS } from '../cron/cron-limits';

export type PeriodResult =
  | { valid: true; startMs: number; endMs: number }
  | { valid: false; message: string };

export const DEFAULT_PERIOD_DAYS = 30;
export const MIN_SUPPORTED_DATE = new Date(MIN_SUPPORTED_DATE_MS);
export const MAX_SUPPORTED_DATE = new Date(MAX_SUPPORTED_DATE_MS);

const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

/** Meia-noite (fuso local) do dia informado. */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Último milissegundo (fuso local) do dia informado. */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Converte as datas do formulário em limites inclusivos de busca:
 * início do dia inicial até o fim do dia final, no fuso local do navegador.
 */
export function resolvePeriod(start: Date | null, end: Date | null): PeriodResult {
  if (start === null || end === null) {
    return { valid: false, message: 'Informe as datas inicial e final.' };
  }
  if (!isValidDate(start) || !isValidDate(end)) {
    return { valid: false, message: 'Informe datas válidas no formato dd/mm/aaaa.' };
  }

  const startMs = startOfDay(start).getTime();
  const endMs = endOfDay(end).getTime();

  if (endMs < startMs) {
    return { valid: false, message: 'A data final deve ser maior ou igual à data inicial.' };
  }
  if (startMs < MIN_SUPPORTED_DATE_MS || endMs > MAX_SUPPORTED_DATE_MS) {
    return {
      valid: false,
      message: 'Período fora do intervalo suportado pela simulação (01/01/1970 a 31/12/2999).',
    };
  }
  return { valid: true, startMs, endMs };
}

export interface TimeZoneInfo {
  name: string;
  offset: string;
}

/** Fuso horário do navegador, exibido na interface (ex.: America/Sao_Paulo · GMT-03:00). */
export function getLocalTimeZone(reference = new Date()): TimeZoneInfo {
  const name = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const minutes = -reference.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const pad = (value: number) => String(value).padStart(2, '0');
  return { name, offset: `GMT${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}` };
}
