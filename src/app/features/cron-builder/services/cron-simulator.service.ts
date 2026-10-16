import { inject, Injectable, InjectionToken, Injector, type Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { concat, map, of, switchMap, timer, type Observable } from 'rxjs';
import type { SimulationRequest } from '../../../core/models/simulation-request.model';
import type { SimulationState } from '../../../core/models/simulation-result.model';
import { CronWorkerManagerService } from '../../../core/services/cron-worker-manager.service';

/** Entrada da simulação derivada (via `computed`) da configuração atual. */
export type SimulationInput =
  | { kind: 'waiting' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ready'; request: SimulationRequest };

/** Espera curta para agrupar alterações sucessivas antes de acionar o Worker. */
export const SIMULATION_DEBOUNCE_MS = new InjectionToken<number>('SIMULATION_DEBOUNCE_MS', {
  providedIn: 'root',
  factory: () => 150,
});

export function sameSimulationInput(a: SimulationInput, b: SimulationInput): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'invalid' && b.kind === 'invalid') return a.message === b.message;
  if (a.kind === 'ready' && b.kind === 'ready') {
    const x = a.request;
    const y = b.request;
    return (
      x.expression === y.expression &&
      x.startMs === y.startMs &&
      x.endMs === y.endMs &&
      x.limit === y.limit
    );
  }
  return true;
}

/**
 * Converte a entrada reativa em estado de simulação.
 *
 * Cada nova entrada cancela a anterior (`switchMap`): a resposta antiga nunca chega à tela
 * e o Worker ocupado com ela é encerrado. Nenhum cálculo roda na thread principal.
 */
@Injectable({ providedIn: 'root' })
export class CronSimulatorService {
  private readonly workers = inject(CronWorkerManagerService);
  private readonly debounceMs = inject(SIMULATION_DEBOUNCE_MS);

  /** Deve ser chamado em contexto de injeção ou com um `injector` explícito. */
  connect(input: Signal<SimulationInput>, injector = inject(Injector)): Signal<SimulationState> {
    const state$ = toObservable(input, { injector }).pipe(
      switchMap((value) => this.toState(value)),
    );
    return toSignal(state$, { initialValue: { status: 'waiting' }, injector });
  }

  private toState(input: SimulationInput): Observable<SimulationState> {
    switch (input.kind) {
      case 'waiting':
        return of({ status: 'waiting' });
      case 'invalid':
        return of({ status: 'invalid', message: input.message });
      case 'ready':
        return concat(
          of<SimulationState>({ status: 'calculating' }),
          timer(this.debounceMs).pipe(
            switchMap(() => this.workers.simulate(input.request)),
            map((outcome): SimulationState => outcome),
          ),
        );
    }
  }
}
