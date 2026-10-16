import { Cron, type CronOptions } from 'croner';

/**
 * Opções que alinham o croner à semântica do Spring `CronExpression`:
 * - `6-part`: exatamente seis campos (segundo minuto hora dia-do-mês mês dia-da-semana);
 * - `domAndDow`: dia-do-mês E dia-da-semana precisam coincidir (o Spring usa AND, não o OR do Vixie cron);
 * - `paused`: a instância só é usada para cálculo, nunca agenda nada.
 */
export const SPRING_CRON_OPTIONS: CronOptions = Object.freeze({
  mode: '6-part',
  domAndDow: true,
  paused: true,
});

/** Abstração mínima usada pelo simulador: apenas "qual a próxima ocorrência depois de X?". */
export interface CronScheduler {
  next(after: Date): Date | null;
}

export type CronSchedulerFactory = (expression: string) => CronScheduler;

/** Cria um agendador baseado no croner. Lança erro se a expressão for inválida. */
export const createSpringCronScheduler: CronSchedulerFactory = (expression) => {
  const cron = new Cron(expression, { ...SPRING_CRON_OPTIONS });
  return { next: (after) => cron.nextRun(after) };
};

/** Retorna `null` quando a expressão é válida, ou a mensagem de erro da biblioteca. */
export function validateCronExpression(expression: string): string | null {
  try {
    createSpringCronScheduler(expression);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
