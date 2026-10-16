export type SimulationErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_EXPRESSION'
  | 'UNSUPPORTED_RANGE'
  | 'INTERNAL_ERROR';

export interface SimulationError {
  code: SimulationErrorCode;
  message: string;
}

/** Resultado do cálculo incremental (executado dentro do Worker). */
export interface SimulationComputation {
  /** Ocorrências encontradas, em epoch ms, em ordem crescente. */
  executions: number[];
  /** Quantas vezes a biblioteca foi consultada pela próxima ocorrência. */
  lookups: number;
  /** Verdadeiro quando a busca parou por atingir o limite solicitado. */
  limitReached: boolean;
}

/** Mensagens que o Worker devolve para a thread principal. */
export type WorkerResponseMessage =
  | ({ type: 'result'; id: number } & SimulationComputation)
  | { type: 'error'; id: number; error: SimulationError };

/** Estados explícitos da simulação exibidos na interface. */
export type SimulationState =
  | { status: 'waiting' }
  | { status: 'calculating' }
  | { status: 'done'; executions: number[]; limitReached: boolean }
  | { status: 'empty' }
  | { status: 'invalid'; message: string }
  | { status: 'timeout'; message: string }
  | { status: 'error'; message: string };

export const TIMEOUT_MESSAGE =
  'Não foi possível calcular as próximas execuções dentro do tempo permitido. Tente ajustar o período ou a expressão.';
