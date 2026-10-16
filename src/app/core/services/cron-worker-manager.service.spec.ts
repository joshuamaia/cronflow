import { TestBed } from '@angular/core/testing';
import type { Subscription } from 'rxjs';
import { createFakeWorkerFactory } from '../../../testing/fake-simulation-worker';
import type { SimulationRequest } from '../models/simulation-request.model';
import { TIMEOUT_MESSAGE } from '../models/simulation-result.model';
import {
  CRON_WORKER_FACTORY,
  CronWorkerManagerService,
  SIMULATION_TIMEOUT_MS,
  type SimulationOutcome,
} from './cron-worker-manager.service';

const day = (d: number, h = 0, m = 0, s = 0, ms = 0) => new Date(2026, 9, d, h, m, s, ms).getTime();

const dailyRequest: SimulationRequest = {
  expression: '0 30 8 * * *',
  startMs: day(16),
  endMs: day(20, 23, 59, 59, 999),
  limit: 5,
};
const everySecondRequest: SimulationRequest = { ...dailyRequest, expression: '* * * * * *' };

describe('CronWorkerManagerService', () => {
  let fake: ReturnType<typeof createFakeWorkerFactory>;
  let manager: CronWorkerManagerService;

  function collect(request: SimulationRequest) {
    const outcomes: SimulationOutcome[] = [];
    let completed = false;
    const subscription: Subscription = manager.simulate(request).subscribe({
      next: (outcome) => outcomes.push(outcome),
      complete: () => (completed = true),
    });
    return { outcomes, subscription, isCompleted: () => completed };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    fake = createFakeWorkerFactory('manual');
    TestBed.configureTestingModule({
      providers: [
        { provide: CRON_WORKER_FACTORY, useValue: fake.factory },
        { provide: SIMULATION_TIMEOUT_MS, useValue: 2000 },
      ],
    });
    manager = TestBed.inject(CronWorkerManagerService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('envia os parâmetros ao Worker com um id único', () => {
    collect(dailyRequest);
    expect(fake.workers).toHaveLength(1);
    expect(fake.workers[0].received).toEqual([{ type: 'simulate', id: 1, request: dailyRequest }]);
  });

  it('retorna os resultados calculados pelo Worker', () => {
    const run = collect(dailyRequest);
    fake.workers[0].respondToLast();

    expect(run.outcomes).toEqual([
      {
        status: 'done',
        executions: [day(16, 8, 30), day(17, 8, 30), day(18, 8, 30), day(19, 8, 30), day(20, 8, 30)],
        limitReached: true,
      },
    ]);
    expect(run.isCompleted()).toBe(true);
  });

  it('diferencia período sem execuções', () => {
    const run = collect({ ...dailyRequest, expression: '0 0 6 31 2 *' });
    fake.workers[0].respondToLast();
    expect(run.outcomes).toEqual([{ status: 'empty' }]);
  });

  it('converte erros estruturados do Worker em estado inválido', () => {
    const run = collect({ ...dailyRequest, expression: '0 9 * * *' });
    fake.workers[0].respondToLast();
    expect(run.outcomes[0]).toMatchObject({ status: 'invalid' });
  });

  it('trata falha do Worker como erro de processamento e libera o Worker', () => {
    const run = collect(dailyRequest);
    fake.workers[0].fail();

    expect(run.outcomes).toEqual([
      { status: 'error', message: 'Falha no processamento da simulação.' },
    ]);
    expect(fake.workers[0].terminated).toBe(true);
    expect(manager.hasActiveWorker).toBe(false);
  });

  it('reaproveita o Worker ocioso entre solicitações sequenciais', () => {
    collect(dailyRequest);
    fake.workers[0].respondToLast();
    collect(everySecondRequest);
    fake.workers[0].respondToLast();

    expect(fake.workers).toHaveLength(1);
    expect(fake.workers[0].terminated).toBe(false);
  });

  it('cancela a simulação ao cancelar a inscrição, encerrando o Worker ocupado', () => {
    const run = collect(dailyRequest);
    run.subscription.unsubscribe();

    expect(fake.workers[0].terminated).toBe(true);
    expect(manager.hasActiveWorker).toBe(false);
  });

  it('descarta respostas obsoletas e mantém somente a configuração mais recente', () => {
    // 1) Simulação diária iniciada; 2) usuário muda para "a cada segundo".
    const daily = collect(dailyRequest);
    daily.subscription.unsubscribe();
    const everySecond = collect(everySecondRequest);

    const [oldWorker, newWorker] = fake.workers;
    expect(oldWorker.terminated).toBe(true);

    // A resposta antiga chega atrasada e é ignorada.
    oldWorker.respond({ type: 'result', id: 1, executions: [day(16, 8, 30)], lookups: 1, limitReached: false });
    expect(daily.outcomes).toEqual([]);
    expect(everySecond.outcomes).toEqual([]);

    newWorker.respondToLast();
    expect(everySecond.outcomes[0]).toMatchObject({ status: 'done' });
    if (everySecond.outcomes[0].status === 'done') {
      expect(everySecond.outcomes[0].executions[1] - everySecond.outcomes[0].executions[0]).toBe(1000);
    }
  });

  it('ignora respostas com id diferente da solicitação pendente', () => {
    const run = collect(dailyRequest);
    fake.workers[0].respond({ type: 'result', id: 999, executions: [1], lookups: 1, limitReached: false });
    expect(run.outcomes).toEqual([]);

    fake.workers[0].respondToLast();
    expect(run.outcomes).toHaveLength(1);
  });

  it('finaliza a solicitação anterior quando uma nova a substitui sem cancelamento', () => {
    const first = collect(dailyRequest);
    const second = collect(everySecondRequest);

    expect(first.isCompleted()).toBe(true);
    expect(first.outcomes).toEqual([]);
    expect(fake.workers[0].terminated).toBe(true);

    fake.workers[1].respondToLast();
    expect(second.outcomes[0]).toMatchObject({ status: 'done' });
  });

  it('encerra o Worker que excede o timeout e informa o estado de tempo excedido', () => {
    const run = collect(everySecondRequest);

    vi.advanceTimersByTime(1999);
    expect(run.outcomes).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(run.outcomes).toEqual([{ status: 'timeout', message: TIMEOUT_MESSAGE }]);
    expect(run.isCompleted()).toBe(true);
    expect(fake.workers[0].terminated).toBe(true);
    expect(manager.hasActiveWorker).toBe(false);

    // Uma resposta tardia não sobrescreve o timeout.
    fake.workers[0].respondToLast();
    expect(run.outcomes).toHaveLength(1);
  });

  it('cria um novo Worker após um timeout', () => {
    collect(everySecondRequest);
    vi.advanceTimersByTime(2000);

    const next = collect(dailyRequest);
    expect(fake.workers).toHaveLength(2);
    fake.workers[1].respondToLast();
    expect(next.outcomes[0]).toMatchObject({ status: 'done' });
  });

  it('não dispara timeout após uma resposta concluída', () => {
    const run = collect(dailyRequest);
    fake.workers[0].respondToLast();
    vi.advanceTimersByTime(5000);
    expect(run.outcomes).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('libera o Worker quando o serviço é destruído', () => {
    collect(dailyRequest);
    TestBed.resetTestingModule();
    expect(fake.workers[0].terminated).toBe(true);
  });

  it('retorna erro quando não é possível criar o Worker', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CRON_WORKER_FACTORY,
          useValue: () => {
            throw new ReferenceError('Worker is not defined');
          },
        },
      ],
    });
    manager = TestBed.inject(CronWorkerManagerService);

    const run = collect(dailyRequest);
    expect(run.outcomes[0]).toMatchObject({ status: 'error' });
    expect(vi.getTimerCount()).toBe(0);
  });
});
