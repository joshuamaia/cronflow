import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createFakeWorkerFactory } from '../../../../testing/fake-simulation-worker';
import type { SimulationRequest } from '../../../core/models/simulation-request.model';
import { CRON_WORKER_FACTORY } from '../../../core/services/cron-worker-manager.service';
import {
  CronSimulatorService,
  sameSimulationInput,
  SIMULATION_DEBOUNCE_MS,
  type SimulationInput,
} from './cron-simulator.service';

const request = (expression: string): SimulationRequest => ({
  expression,
  startMs: new Date(2026, 9, 16).getTime(),
  endMs: new Date(2026, 9, 20, 23, 59, 59, 999).getTime(),
  limit: 5,
});

describe('CronSimulatorService', () => {
  let fake: ReturnType<typeof createFakeWorkerFactory>;

  function setup(initial: SimulationInput) {
    const input = signal<SimulationInput>(initial, { equal: sameSimulationInput });
    const state = TestBed.inject(CronSimulatorService).connect(input, TestBed.inject(Injector));
    TestBed.tick();
    return { input, state };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    fake = createFakeWorkerFactory('manual');
    TestBed.configureTestingModule({
      providers: [
        { provide: CRON_WORKER_FACTORY, useValue: fake.factory },
        { provide: SIMULATION_DEBOUNCE_MS, useValue: 150 },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('começa aguardando configuração', () => {
    const { state } = setup({ kind: 'waiting' });
    expect(state()).toEqual({ status: 'waiting' });
  });

  it('exibe configuração inválida sem acionar o Worker', () => {
    const { state } = setup({ kind: 'invalid', message: 'Selecione pelo menos um dia da semana.' });
    vi.advanceTimersByTime(1000);
    expect(state()).toEqual({ status: 'invalid', message: 'Selecione pelo menos um dia da semana.' });
    expect(fake.workers).toHaveLength(0);
  });

  it('indica cálculo, aplica debounce e conclui com o resultado do Worker', () => {
    const { state } = setup({ kind: 'ready', request: request('0 30 8 * * *') });
    expect(state()).toEqual({ status: 'calculating' });

    vi.advanceTimersByTime(149);
    expect(fake.workers).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(fake.workers[0].received).toHaveLength(1);

    fake.workers[0].respondToLast();
    expect(state()).toMatchObject({ status: 'done' });
  });

  it('agrupa alterações sucessivas em uma única simulação', () => {
    const { input } = setup({ kind: 'ready', request: request('0 30 8 * * *') });
    for (const expression of ['0 0 9 * * *', '0 0 10 * * *', '0 0 11 * * *']) {
      vi.advanceTimersByTime(50);
      input.set({ kind: 'ready', request: request(expression) });
      TestBed.tick();
    }
    vi.advanceTimersByTime(150);

    const posted = fake.workers.flatMap((worker) => worker.received);
    expect(posted.map((message) => message.request.expression)).toEqual(['0 0 11 * * *']);
  });

  it('descarta a simulação em andamento quando a configuração muda', () => {
    const { input, state } = setup({ kind: 'ready', request: request('0 30 8 * * *') });
    vi.advanceTimersByTime(150);
    const [dailyWorker] = fake.workers;

    input.set({ kind: 'ready', request: request('* * * * * *') });
    TestBed.tick();
    expect(dailyWorker.terminated).toBe(true);
    expect(state()).toEqual({ status: 'calculating' });

    // Resposta antiga chegando depois não aparece como resultado atual.
    dailyWorker.respondToLast();
    expect(state()).toEqual({ status: 'calculating' });

    vi.advanceTimersByTime(150);
    fake.workers[1].respondToLast();
    const current = state();
    expect(current.status).toBe('done');
    if (current.status === 'done') {
      expect(current.executions[1] - current.executions[0]).toBe(1000);
    }
  });

  it('não reprocessa quando a entrada é equivalente', () => {
    const { input } = setup({ kind: 'ready', request: request('0 30 8 * * *') });
    vi.advanceTimersByTime(150);
    fake.workers[0].respondToLast();

    input.set({ kind: 'ready', request: request('0 30 8 * * *') });
    TestBed.tick();
    vi.advanceTimersByTime(500);
    expect(fake.workers[0].received).toHaveLength(1);
  });

  it('delega o cálculo ao Worker: sem resposta dele, nenhum resultado é produzido', () => {
    const { state } = setup({ kind: 'ready', request: request('* * * * * *') });
    vi.advanceTimersByTime(1500);
    expect(fake.workers[0].received).toHaveLength(1);
    expect(state()).toEqual({ status: 'calculating' });
  });

  it('informa tempo excedido sem bloquear quando o Worker não responde', () => {
    const { state } = setup({ kind: 'ready', request: request('* * * * * *') });
    vi.advanceTimersByTime(150 + 2000);
    expect(state()).toMatchObject({ status: 'timeout' });
    expect(fake.workers[0].terminated).toBe(true);
  });
});
