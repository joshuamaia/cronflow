/** Quantidades de execuções que a interface permite solicitar. */
export const RESULT_LIMIT_OPTIONS = [5, 10, 20] as const;
export type ResultLimit = (typeof RESULT_LIMIT_OPTIONS)[number];
export const MAX_RESULT_LIMIT = 20;
export const DEFAULT_RESULT_LIMIT: ResultLimit = 10;

/**
 * Parâmetros de uma simulação. As datas trafegam como epoch em milissegundos
 * (valores serializáveis e sem ambiguidade entre a thread principal e o Worker).
 */
export interface SimulationRequest {
  expression: string;
  /** Início inclusivo da busca (início do dia inicial, fuso local). */
  startMs: number;
  /** Fim inclusivo da busca (último milissegundo do dia final, fuso local). */
  endMs: number;
  limit: number;
}

/** Mensagem enviada da thread principal para o Worker. */
export interface SimulateMessage {
  type: 'simulate';
  id: number;
  request: SimulationRequest;
}
