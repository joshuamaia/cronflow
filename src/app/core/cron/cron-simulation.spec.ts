import type { SimulationRequest } from '../models/simulation-request.model';
import { createSpringCronScheduler, type CronSchedulerFactory } from './cron-engine';
import { MAX_SUPPORTED_DATE_MS } from './cron-limits';
import { handleSimulationMessage, SimulationFailure, simulateExecutions } from './cron-simulation';

type Day = [year: number, month: number, day: number];

/** Período inclusivo em fuso local: início do primeiro dia até o fim do último. */
function request(expression: string, start: Day, end: Day, limit = 10): SimulationRequest {
  return {
    expression,
    startMs: new Date(start[0], start[1] - 1, start[2]).getTime(),
    endMs: new Date(end[0], end[1] - 1, end[2], 23, 59, 59, 999).getTime(),
    limit,
  };
}

function local(ms: number): string {
  const d = new Date(ms);
  const pad = (v: number) => String(v).padStart(2, '0');
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function run(req: SimulationRequest, factory?: CronSchedulerFactory): string[] {
  return simulateExecutions(req, factory).executions.map(local);
}

function errorOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof SimulationFailure) return error.error;
    throw error;
  }
  throw new Error('Era esperado um erro.');
}

/** Envolve o agendador real contando quantas vezes a próxima ocorrência é consultada. */
function countingFactory() {
  const stats = { lookups: 0 };
  const factory: CronSchedulerFactory = (expression) => {
    const scheduler = createSpringCronScheduler(expression);
    return {
      next: (after) => {
        stats.lookups++;
        return scheduler.next(after);
      },
    };
  };
  return { factory, stats };
}

describe('simulateExecutions — próximas execuções', () => {
  it('calcula as execuções diárias corretas', () => {
    expect(run(request('0 30 8 * * *', [2026, 10, 16], [2026, 10, 18]))).toEqual([
      '16/10/2026 08:30:00',
      '17/10/2026 08:30:00',
      '18/10/2026 08:30:00',
    ]);
  });

  it('ignora finais de semana em MON-FRI', () => {
    expect(run(request('0 30 8 * * MON-FRI', [2026, 10, 16], [2026, 12, 31], 5))).toEqual([
      '16/10/2026 08:30:00',
      '19/10/2026 08:30:00',
      '20/10/2026 08:30:00',
      '21/10/2026 08:30:00',
      '22/10/2026 08:30:00',
    ]);
  });

  it('aceita listas com sábado e domingo', () => {
    expect(run(request('0 0 10 * * SUN,SAT', [2026, 10, 16], [2026, 10, 25]))).toEqual([
      '17/10/2026 10:00:00',
      '18/10/2026 10:00:00',
      '24/10/2026 10:00:00',
      '25/10/2026 10:00:00',
    ]);
  });

  it('atravessa a virada de mês', () => {
    expect(run(request('0 0 6 * * *', [2026, 10, 30], [2026, 11, 1]))).toEqual([
      '30/10/2026 06:00:00',
      '31/10/2026 06:00:00',
      '01/11/2026 06:00:00',
    ]);
  });

  it('atravessa a virada de ano', () => {
    expect(run(request('0 59 23 * * *', [2026, 12, 30], [2027, 1, 1]))).toEqual([
      '30/12/2026 23:59:00',
      '31/12/2026 23:59:00',
      '01/01/2027 23:59:00',
    ]);
  });

  it('respeita o ano bissexto (29/02 só em 2028)', () => {
    expect(run(request('0 0 0 29 * *', [2027, 1, 1], [2028, 3, 31], 20))).toEqual([
      '29/01/2027 00:00:00',
      '29/03/2027 00:00:00',
      '29/04/2027 00:00:00',
      '29/05/2027 00:00:00',
      '29/06/2027 00:00:00',
      '29/07/2027 00:00:00',
      '29/08/2027 00:00:00',
      '29/09/2027 00:00:00',
      '29/10/2027 00:00:00',
      '29/11/2027 00:00:00',
      '29/12/2027 00:00:00',
      '29/01/2028 00:00:00',
      '29/02/2028 00:00:00',
      '29/03/2028 00:00:00',
    ]);
  });

  it('pula meses sem dia 31', () => {
    expect(run(request('0 0 6 31 * *', [2027, 1, 1], [2027, 12, 31], 20))).toEqual([
      '31/01/2027 06:00:00',
      '31/03/2027 06:00:00',
      '31/05/2027 06:00:00',
      '31/07/2027 06:00:00',
      '31/08/2027 06:00:00',
      '31/10/2027 06:00:00',
      '31/12/2027 06:00:00',
    ]);
  });

  it('retorna vazio quando não há ocorrências no período, com uma única consulta', () => {
    const { factory, stats } = countingFactory();
    const result = simulateExecutions(request('0 0 6 31 * *', [2027, 2, 1], [2027, 2, 28]), factory);
    expect(result.executions).toEqual([]);
    expect(result.limitReached).toBe(false);
    expect(stats.lookups).toBe(1);
  });

  it('inclui o primeiro instante do dia inicial e o último do dia final', () => {
    expect(run(request('0 0 0 * * *', [2026, 10, 16], [2026, 10, 16]))).toEqual([
      '16/10/2026 00:00:00',
    ]);
    expect(run(request('59 59 23 * * *', [2026, 10, 16], [2026, 10, 16]))).toEqual([
      '16/10/2026 23:59:59',
    ]);
  });

  it('não inclui ocorrências após o fim do período', () => {
    expect(run(request('0 0 0 * * *', [2026, 10, 16], [2026, 10, 17]))).toEqual([
      '16/10/2026 00:00:00',
      '17/10/2026 00:00:00',
    ]);
  });

  it('respeita o limite máximo de resultados', () => {
    const result = simulateExecutions(request('0 */15 * * * *', [2026, 10, 16], [2026, 12, 31], 20));
    expect(result.executions).toHaveLength(20);
    expect(result.limitReached).toBe(true);
  });

  it('calcula expressões de alta frequência segundo a segundo', () => {
    expect(run(request('* * * * * *', [2026, 10, 16], [2026, 10, 16], 5))).toEqual([
      '16/10/2026 00:00:00',
      '16/10/2026 00:00:01',
      '16/10/2026 00:00:02',
      '16/10/2026 00:00:03',
      '16/10/2026 00:00:04',
    ]);
    expect(run(request('*/5 * * * * *', [2026, 10, 16], [2026, 10, 16], 3))).toEqual([
      '16/10/2026 00:00:00',
      '16/10/2026 00:00:05',
      '16/10/2026 00:00:10',
    ]);
  });

  it('alinha intervalos de horas ao relógio', () => {
    expect(run(request('0 0 */8 * * *', [2026, 10, 16], [2026, 10, 17], 4))).toEqual([
      '16/10/2026 00:00:00',
      '16/10/2026 08:00:00',
      '16/10/2026 16:00:00',
      '17/10/2026 00:00:00',
    ]);
  });
});

describe('simulateExecutions — validação', () => {
  it('rejeita expressões fora do padrão Spring de 6 campos', () => {
    const req = request('0 9 * * *', [2026, 1, 1], [2026, 1, 2]);
    expect(errorOf(() => simulateExecutions(req)).code).toBe('INVALID_EXPRESSION');
  });

  it('rejeita limites inválidos, datas inválidas e períodos invertidos', () => {
    const base = request('* * * * * *', [2026, 1, 1], [2026, 1, 2]);
    expect(errorOf(() => simulateExecutions({ ...base, limit: 21 })).code).toBe('INVALID_REQUEST');
    expect(errorOf(() => simulateExecutions({ ...base, limit: 0 })).code).toBe('INVALID_REQUEST');
    expect(errorOf(() => simulateExecutions({ ...base, endMs: base.startMs - 1 })).code).toBe(
      'INVALID_REQUEST',
    );
    expect(errorOf(() => simulateExecutions({ ...base, startMs: Number.NaN })).code).toBe(
      'INVALID_REQUEST',
    );
  });

  it('rejeita datas não suportadas sem iniciar o cálculo', () => {
    const factorySpy = vi.fn(createSpringCronScheduler);
    const thousandYearsFromNow = request('* * * * * *', [2026, 10, 16], [3026, 10, 16], 20);
    const beforeEpoch = request('* * * * * *', [1969, 12, 31], [1970, 1, 2], 20);

    expect(errorOf(() => simulateExecutions(thousandYearsFromNow, factorySpy)).code).toBe(
      'UNSUPPORTED_RANGE',
    );
    expect(errorOf(() => simulateExecutions(beforeEpoch, factorySpy)).code).toBe(
      'UNSUPPORTED_RANGE',
    );
    expect(factorySpy).not.toHaveBeenCalled();
  });
});

describe('simulateExecutions — desempenho em períodos extremos', () => {
  // `* * * * * *` por 1.000 anos (2000–2999, o máximo representável pela biblioteca).
  const extreme = request('* * * * * *', [2000, 1, 1], [2999, 12, 31], 20);

  it('retorna somente as 20 primeiras ocorrências', () => {
    const result = simulateExecutions(extreme);
    expect(result.executions).toHaveLength(20);
    expect(result.executions.map(local).slice(0, 2)).toEqual([
      '01/01/2000 00:00:00',
      '01/01/2000 00:00:01',
    ]);
    expect(result.executions.map(local).at(-1)).toBe('01/01/2000 00:00:19');
    expect(result.limitReached).toBe(true);
  });

  it('consulta a biblioteca uma vez por resultado, não uma vez por segundo do período', () => {
    const { factory, stats } = countingFactory();
    const result = simulateExecutions(extreme, factory);

    // São ~3,15 × 10¹⁰ segundos no período; a estratégia incremental faz apenas 20 consultas.
    const secondsInPeriod = (extreme.endMs - extreme.startMs) / 1000;
    expect(secondsInPeriod).toBeGreaterThan(3e10);
    expect(stats.lookups).toBe(20);
    expect(result.lookups).toBe(20);
  });

  it('não cria coleções nem trabalho proporcionais ao período', () => {
    const oneDay = countingFactory();
    const thousandYears = countingFactory();

    const short = simulateExecutions(
      request('* * * * * *', [2000, 1, 1], [2000, 1, 1], 20),
      oneDay.factory,
    );
    const long = simulateExecutions(extreme, thousandYears.factory);

    // 1 dia ou 1.000 anos: mesmo resultado, mesmo número de consultas, mesmo tamanho de coleção.
    expect(long.executions).toEqual(short.executions);
    expect(long.executions).toHaveLength(20);
    expect(thousandYears.stats.lookups).toBe(oneDay.stats.lookups);
  });

  it('para quando o período termina, mesmo com limite maior', () => {
    const { factory, stats } = countingFactory();
    const req = request('0 0 0 1 1 *', [2026, 1, 1], [2028, 12, 31], 20);
    const result = simulateExecutions(req, factory);
    expect(result.executions.map(local)).toEqual([
      '01/01/2026 00:00:00',
      '01/01/2027 00:00:00',
      '01/01/2028 00:00:00',
    ]);
    expect(stats.lookups).toBe(4);
  });

  it('encerra quando não existem novas ocorrências (fim do suporte da biblioteca)', () => {
    const req: SimulationRequest = {
      expression: '* * * * * *',
      startMs: MAX_SUPPORTED_DATE_MS - 1999,
      endMs: MAX_SUPPORTED_DATE_MS,
      limit: 20,
    };
    const result = simulateExecutions(req);
    expect(result.executions.map(local)).toEqual(['31/12/2999 23:59:58', '31/12/2999 23:59:59']);
    expect(result.limitReached).toBe(false);
  });

  it('conclui rapidamente (complemento às verificações de estratégia)', () => {
    const started = performance.now();
    simulateExecutions(extreme);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('handleSimulationMessage — contrato do Worker', () => {
  it('recebe parâmetros e retorna resultados com o mesmo id', () => {
    const response = handleSimulationMessage({
      type: 'simulate',
      id: 7,
      request: request('0 0 9 * * MON-FRI', [2026, 10, 16], [2026, 10, 20], 5),
    });
    expect(response.type).toBe('result');
    expect(response.id).toBe(7);
    if (response.type === 'result') expect(response.executions).toHaveLength(3);
  });

  it('retorna erros estruturados para expressões inválidas', () => {
    const response = handleSimulationMessage({
      type: 'simulate',
      id: 3,
      request: request('isso não é cron', [2026, 10, 16], [2026, 10, 20]),
    });
    expect(response).toEqual({
      type: 'error',
      id: 3,
      error: { code: 'INVALID_EXPRESSION', message: expect.any(String) },
    });
  });

  it('retorna erro estruturado para mensagens malformadas', () => {
    expect(handleSimulationMessage(null)).toMatchObject({
      type: 'error',
      id: -1,
      error: { code: 'INVALID_REQUEST' },
    });
    expect(handleSimulationMessage({ type: 'other', id: 1 })).toMatchObject({
      type: 'error',
      id: 1,
    });
    expect(
      handleSimulationMessage({ type: 'simulate', id: 2, request: { expression: 1 } }),
    ).toMatchObject({ type: 'error', id: 2, error: { code: 'INVALID_REQUEST' } });
  });

  it('converte falhas inesperadas em INTERNAL_ERROR sem expor detalhes', () => {
    const exploding: CronSchedulerFactory = () => ({
      next: () => {
        throw new Error('stack interno');
      },
    });
    const response = handleSimulationMessage(
      { type: 'simulate', id: 9, request: request('* * * * * *', [2026, 1, 1], [2026, 1, 2]) },
      exploding,
    );
    expect(response).toEqual({
      type: 'error',
      id: 9,
      error: { code: 'INTERNAL_ERROR', message: 'Falha inesperada ao calcular as execuções.' },
    });
  });
});
