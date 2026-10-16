import { MAX_RESULT_LIMIT, type SimulationRequest } from '../models/simulation-request.model';
import type {
  SimulationComputation,
  SimulationError,
  WorkerResponseMessage,
} from '../models/simulation-result.model';
import { createSpringCronScheduler, type CronSchedulerFactory } from './cron-engine';
import { MAX_SUPPORTED_DATE_MS, MIN_SUPPORTED_DATE_MS } from './cron-limits';

const MAX_EXPRESSION_LENGTH = 120;

export class SimulationFailure extends Error {
  constructor(readonly error: SimulationError) {
    super(error.message);
  }
}

function fail(code: SimulationError['code'], message: string): never {
  throw new SimulationFailure({ code, message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Valida estruturalmente os parâmetros recebidos (podem vir de qualquer `postMessage`). */
export function assertValidRequest(value: unknown): asserts value is SimulationRequest {
  if (!isRecord(value)) fail('INVALID_REQUEST', 'Parâmetros de simulação ausentes.');

  const { expression, startMs, endMs, limit } = value;
  if (typeof expression !== 'string' || !expression.trim() || expression.length > MAX_EXPRESSION_LENGTH) {
    fail('INVALID_REQUEST', 'Expressão CRON ausente ou inválida.');
  }
  if (!Number.isSafeInteger(startMs) || !Number.isSafeInteger(endMs)) {
    fail('INVALID_REQUEST', 'As datas do período são inválidas.');
  }
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > MAX_RESULT_LIMIT) {
    fail('INVALID_REQUEST', `A quantidade de execuções deve estar entre 1 e ${MAX_RESULT_LIMIT}.`);
  }
  if ((endMs as number) < (startMs as number)) {
    fail('INVALID_REQUEST', 'A data final deve ser maior ou igual à data inicial.');
  }
  if ((startMs as number) < MIN_SUPPORTED_DATE_MS || (endMs as number) > MAX_SUPPORTED_DATE_MS) {
    fail('UNSUPPORTED_RANGE', 'O período informado está fora do intervalo suportado (01/01/1970 a 31/12/2999).');
  }
}

/**
 * Simulação incremental: pede à biblioteca somente a próxima ocorrência, uma de cada vez,
 * e para assim que atinge o limite, ultrapassa a data final ou não há novas ocorrências.
 *
 * O custo é proporcional a `limit` (no máximo `limit + 1` consultas), nunca ao tamanho do período.
 */
export function simulateExecutions(
  request: SimulationRequest,
  createScheduler: CronSchedulerFactory = createSpringCronScheduler,
): SimulationComputation {
  assertValidRequest(request);

  let scheduler;
  try {
    scheduler = createScheduler(request.expression);
  } catch {
    fail('INVALID_EXPRESSION', 'A expressão CRON não é válida no padrão Spring (6 campos).');
  }

  const executions: number[] = [];
  let lookups = 0;
  // A biblioteca retorna ocorrências estritamente posteriores ao cursor:
  // recuar 1 ms torna o início do período inclusivo.
  let cursor = new Date(request.startMs - 1);

  while (executions.length < request.limit) {
    lookups++;
    const next = scheduler.next(cursor);
    if (next === null || next.getTime() > request.endMs) break;
    executions.push(next.getTime());
    cursor = next;
  }

  return { executions, lookups, limitReached: executions.length === request.limit };
}

/** Processa uma mensagem recebida pelo Worker, sempre devolvendo uma resposta estruturada. */
export function handleSimulationMessage(
  data: unknown,
  createScheduler: CronSchedulerFactory = createSpringCronScheduler,
): WorkerResponseMessage {
  const id = isRecord(data) && Number.isSafeInteger(data['id']) ? (data['id'] as number) : -1;

  try {
    if (!isRecord(data) || data['type'] !== 'simulate' || id < 0) {
      fail('INVALID_REQUEST', 'Mensagem de simulação malformada.');
    }
    return { type: 'result', id, ...simulateExecutions(data['request'] as SimulationRequest, createScheduler) };
  } catch (error) {
    if (error instanceof SimulationFailure) return { type: 'error', id, error: error.error };
    return {
      type: 'error',
      id,
      error: { code: 'INTERNAL_ERROR', message: 'Falha inesperada ao calcular as execuções.' },
    };
  }
}
