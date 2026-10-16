import type { CronConfig } from '../../../../core/models/cron-config.model';

export interface CronExample {
  id: string;
  title: string;
  description: string;
  expression: string;
  icon: string;
  config: Partial<CronConfig>;
}

/** Exemplos pré-configurados: aplicam a configuração no construtor visual. */
export const CRON_EXAMPLES: readonly CronExample[] = [
  {
    id: 'daily',
    title: 'Rotina diária',
    description: 'Todos os dias às 08h',
    expression: '0 0 8 * * *',
    icon: 'wb_sunny',
    config: { frequency: 'daily', hour: 8, minute: 0, second: 0 },
  },
  {
    id: 'weekdays',
    title: 'Dias úteis',
    description: 'Segunda a sexta-feira às 09h',
    expression: '0 0 9 * * MON-FRI',
    icon: 'work',
    config: { frequency: 'weekly', weekDays: [1, 2, 3, 4, 5], hour: 9, minute: 0, second: 0 },
  },
  {
    id: 'monthly',
    title: 'Fechamento mensal',
    description: 'Dia 10 de cada mês às 06h',
    expression: '0 0 6 10 * *',
    icon: 'receipt_long',
    config: { frequency: 'monthly', dayOfMonth: 10, hour: 6, minute: 0, second: 0 },
  },
  {
    id: 'monitoring',
    title: 'Monitoramento',
    description: 'A cada 15 minutos',
    expression: '0 */15 * * * *',
    icon: 'monitor_heart',
    config: { frequency: 'minutes', minuteInterval: 15 },
  },
  {
    id: 'high-frequency',
    title: 'Alta frequência',
    description: 'A cada segundo',
    expression: '* * * * * *',
    icon: 'bolt',
    config: { frequency: 'seconds', secondInterval: 1 },
  },
];
