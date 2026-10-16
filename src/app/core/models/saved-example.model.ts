import type { CronConfig } from './cron-config.model';

export const EXAMPLE_TITLE_MAX_LENGTH = 60;
export const EXAMPLE_DESCRIPTION_MAX_LENGTH = 120;

/**
 * Exemplo criado pelo usuário. A expressão não é armazenada: ela é sempre gerada
 * a partir de `config`, para nunca divergir do construtor.
 */
export interface SavedExample {
  id: string;
  title: string;
  description: string;
  config: CronConfig;
  createdAt: number;
  updatedAt: number;
}

/** Dados editáveis de um exemplo (o que o modal devolve). */
export interface SavedExampleDraft {
  title: string;
  description: string;
  config: CronConfig;
}
