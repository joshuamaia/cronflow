import { handleSimulationMessage } from '../app/core/cron/cron-simulation';
import type { SimulateMessage } from '../app/core/models/simulation-request.model';
import type { WorkerResponseMessage } from '../app/core/models/simulation-result.model';
import type { SimulationWorker } from '../app/core/services/cron-worker-manager.service';

/**
 * Dublê de Web Worker para testes (o jsdom não executa Workers).
 * No modo `auto`, responde de forma assíncrona usando a mesma lógica do Worker real.
 */
export class FakeSimulationWorker implements SimulationWorker {
  onmessage: SimulationWorker['onmessage'] = null;
  onerror: SimulationWorker['onerror'] = null;
  readonly received: SimulateMessage[] = [];
  terminated = false;

  constructor(private readonly mode: 'auto' | 'manual' = 'manual') {}

  postMessage(message: SimulateMessage): void {
    this.received.push(message);
    if (this.mode === 'auto') {
      queueMicrotask(() => {
        if (!this.terminated) this.respond(handleSimulationMessage(message));
      });
    }
  }

  /** Entrega uma resposta como o Worker real faria (inclusive após `terminate`, para testar descarte). */
  respond(response: WorkerResponseMessage): void {
    this.onmessage?.({ data: response } as MessageEvent<WorkerResponseMessage>);
  }

  /** Responde à última mensagem recebida com o cálculo real. */
  respondToLast(): void {
    const last = this.received.at(-1);
    if (last) this.respond(handleSimulationMessage(last));
  }

  fail(): void {
    this.onerror?.({ preventDefault: () => undefined } as ErrorEvent);
  }

  terminate(): void {
    this.terminated = true;
  }
}

/** Fábrica que registra todos os Workers criados. */
export function createFakeWorkerFactory(mode: 'auto' | 'manual' = 'manual') {
  const workers: FakeSimulationWorker[] = [];
  const factory = () => {
    const worker = new FakeSimulationWorker(mode);
    workers.push(worker);
    return worker;
  };
  return { factory, workers };
}
