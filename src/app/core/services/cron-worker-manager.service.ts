import { DestroyRef, inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { SimulateMessage, SimulationRequest } from '../models/simulation-request.model';
import {
  TIMEOUT_MESSAGE,
  type SimulationState,
  type WorkerResponseMessage,
} from '../models/simulation-result.model';

/** Subconjunto da API de `Worker` utilizado — permite substituir por um dublê nos testes. */
export interface SimulationWorker {
  onmessage: ((event: MessageEvent<WorkerResponseMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: SimulateMessage): void;
  terminate(): void;
}

export const CRON_WORKER_FACTORY = new InjectionToken<() => SimulationWorker>('CRON_WORKER_FACTORY', {
  providedIn: 'root',
  factory: () => () =>
    new Worker(new URL('../../workers/cron-simulator.worker', import.meta.url), {
      type: 'module',
    }) as SimulationWorker,
});

/** Tempo máximo de uma simulação, controlado pela thread principal. */
export const SIMULATION_TIMEOUT_MS = new InjectionToken<number>('SIMULATION_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => 2000,
});

/** Resultado final de uma simulação (sem os estados transitórios da interface). */
export type SimulationOutcome = Exclude<SimulationState, { status: 'waiting' | 'calculating' }>;

interface PendingRequest {
  id: number;
  settle: (outcome: SimulationOutcome) => void;
  cancel: () => void;
}

/**
 * Orquestra o Web Worker de simulação.
 *
 * - Cada solicitação recebe um ID único; respostas com ID diferente da pendente são descartadas.
 * - Apenas uma simulação roda por vez: um Worker ocupado com uma solicitação obsoleta é encerrado.
 * - Um Worker que não responde dentro do timeout é encerrado e substituído na próxima solicitação.
 * - Um Worker ocioso é reaproveitado, evitando custo de inicialização a cada alteração.
 */
@Injectable({ providedIn: 'root' })
export class CronWorkerManagerService {
  private readonly createWorker = inject(CRON_WORKER_FACTORY);
  private readonly timeoutMs = inject(SIMULATION_TIMEOUT_MS);

  private worker: SimulationWorker | null = null;
  private pending: PendingRequest | null = null;
  private lastId = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disposeWorker());
  }

  /** Indica se há um Worker vivo (útil para verificar liberação de recursos). */
  get hasActiveWorker(): boolean {
    return this.worker !== null;
  }

  /**
   * Executa a simulação no Worker. Cancelar a inscrição antes da resposta encerra o Worker,
   * interrompendo o cálculo obsoleto.
   */
  simulate(request: SimulationRequest): Observable<SimulationOutcome> {
    return new Observable<SimulationOutcome>((subscriber) => {
      const id = ++this.lastId;

      // Um Worker ainda ocupado está calculando algo obsoleto: não há como interromper
      // um loop dentro dele, então ele é encerrado e a solicitação antiga é finalizada sem resultado.
      if (this.pending !== null) {
        this.pending.cancel();
        this.disposeWorker();
      }

      const finish = (outcome?: SimulationOutcome) => {
        clearTimeout(timer);
        if (this.pending?.id === id) this.pending = null;
        if (outcome) subscriber.next(outcome);
        subscriber.complete();
      };

      const timer = setTimeout(() => {
        if (this.pending?.id !== id) return;
        finish({ status: 'timeout', message: TIMEOUT_MESSAGE });
        this.disposeWorker();
      }, this.timeoutMs);

      this.pending = { id, settle: finish, cancel: () => finish() };

      try {
        this.acquireWorker().postMessage({ type: 'simulate', id, request });
      } catch {
        finish({
          status: 'error',
          message: 'Não foi possível iniciar o processamento. Verifique se o navegador suporta Web Workers.',
        });
        this.disposeWorker();
      }

      // Cancelamento pelo consumidor (ex.: `switchMap` recebeu nova configuração).
      return () => {
        clearTimeout(timer);
        if (this.pending?.id === id) this.disposeWorker();
      };
    });
  }

  private acquireWorker(): SimulationWorker {
    if (this.worker) return this.worker;

    const worker = this.createWorker();
    worker.onmessage = ({ data }) => this.handleResponse(data);
    worker.onerror = (event) => {
      event.preventDefault?.();
      this.pending?.settle({ status: 'error', message: 'Falha no processamento da simulação.' });
      this.disposeWorker();
    };
    this.worker = worker;
    return worker;
  }

  private handleResponse(response: WorkerResponseMessage): void {
    // Respostas de solicitações obsoletas são ignoradas.
    if (!this.pending || response.id !== this.pending.id) return;
    this.pending.settle(toOutcome(response));
  }

  private disposeWorker(): void {
    this.pending = null;
    if (!this.worker) return;
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.terminate();
    this.worker = null;
  }
}

function toOutcome(response: WorkerResponseMessage): SimulationOutcome {
  if (response.type === 'result') {
    return response.executions.length === 0
      ? { status: 'empty' }
      : { status: 'done', executions: response.executions, limitReached: response.limitReached };
  }
  switch (response.error.code) {
    case 'INVALID_REQUEST':
    case 'INVALID_EXPRESSION':
    case 'UNSUPPORTED_RANGE':
      return { status: 'invalid', message: response.error.message };
    case 'INTERNAL_ERROR':
      return { status: 'error', message: response.error.message };
  }
}
