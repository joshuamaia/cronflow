import { DEFAULT_CRON_CONFIG, type CronConfig } from '../../../core/models/cron-config.model';
import { validateCronExpression } from '../../../core/cron/cron-engine';
import { CronGeneratorService, formatWeekDays, type CronGenerationResult } from './cron-generator.service';

describe('CronGeneratorService', () => {
  const service = new CronGeneratorService();
  const generate = (config: Partial<CronConfig>) =>
    service.generate({ ...DEFAULT_CRON_CONFIG, ...config });
  const expressionOf = (result: CronGenerationResult) => (result.valid ? result.expression : null);

  describe('diariamente', () => {
    it('gera hora, minuto e segundo fixos', () => {
      expect(expressionOf(generate({ frequency: 'daily', hour: 8, minute: 30, second: 0 }))).toBe(
        '0 30 8 * * *',
      );
      expect(expressionOf(generate({ frequency: 'daily', hour: 23, minute: 59, second: 59 }))).toBe(
        '59 59 23 * * *',
      );
    });
  });

  describe('semanalmente', () => {
    it('compacta dias úteis contínuos em intervalo', () => {
      const result = generate({ frequency: 'weekly', weekDays: [1, 2, 3, 4, 5], hour: 9, minute: 0 });
      expect(expressionOf(result)).toBe('0 0 9 * * MON-FRI');
    });

    it('lista dias não contínuos em ordem', () => {
      const result = generate({ frequency: 'weekly', weekDays: [5, 1, 3], hour: 9, minute: 0 });
      expect(expressionOf(result)).toBe('0 0 9 * * MON,WED,FRI');
    });

    it('usa * quando todos os dias são selecionados', () => {
      expect(formatWeekDays([0, 1, 2, 3, 4, 5, 6])).toBe('*');
    });

    it('trata dois dias contínuos como lista e ignora duplicados', () => {
      expect(formatWeekDays([6, 0])).toBe('SUN,SAT');
      expect(formatWeekDays([2, 2, 3])).toBe('TUE,WED');
    });

    it('não permite seleção vazia', () => {
      expect(generate({ frequency: 'weekly', weekDays: [] })).toEqual({
        valid: false,
        errors: ['Selecione pelo menos um dia da semana.'],
      });
    });
  });

  describe('mensalmente', () => {
    it('gera o dia do mês informado', () => {
      const result = generate({ frequency: 'monthly', dayOfMonth: 10, hour: 6, minute: 0, second: 0 });
      expect(expressionOf(result)).toBe('0 0 6 10 * *');
    });

    it('aceita dia 31', () => {
      expect(expressionOf(generate({ frequency: 'monthly', dayOfMonth: 31, hour: 0, minute: 0 }))).toBe(
        '0 0 0 31 * *',
      );
    });
  });

  describe('intervalos', () => {
    it.each([
      [1, '* * * * * *'],
      [5, '*/5 * * * * *'],
      [30, '*/30 * * * * *'],
    ])('segundos: %i → %s', (secondInterval, expected) => {
      expect(expressionOf(generate({ frequency: 'seconds', secondInterval }))).toBe(expected);
    });

    it.each([
      [1, '0 * * * * *'],
      [15, '0 */15 * * * *'],
    ])('minutos: %i → %s', (minuteInterval, expected) => {
      expect(expressionOf(generate({ frequency: 'minutes', minuteInterval }))).toBe(expected);
    });

    it.each([
      [1, '0 0 * * * *'],
      [2, '0 0 */2 * * *'],
      [12, '0 0 */12 * * *'],
    ])('horas: %i → %s', (hourInterval, expected) => {
      expect(expressionOf(generate({ frequency: 'hours', hourInterval }))).toBe(expected);
    });

    it('rejeita intervalos não suportados', () => {
      expect(generate({ frequency: 'seconds', secondInterval: 7 }).valid).toBe(false);
      expect(generate({ frequency: 'minutes', minuteInterval: 45 }).valid).toBe(false);
      expect(generate({ frequency: 'hours', hourInterval: 5 }).valid).toBe(false);
    });
  });

  describe('configurações inválidas', () => {
    it.each<[Partial<CronConfig>, string]>([
      [{ hour: 24 }, 'A hora deve estar entre 0 e 23.'],
      [{ hour: -1 }, 'A hora deve estar entre 0 e 23.'],
      [{ minute: 60 }, 'O minuto deve estar entre 0 e 59.'],
      [{ second: 60 }, 'O segundo deve estar entre 0 e 59.'],
      [{ hour: 8.5 }, 'A hora deve estar entre 0 e 23.'],
      [{ frequency: 'monthly', dayOfMonth: 0 }, 'O dia do mês deve estar entre 1 e 31.'],
      [{ frequency: 'monthly', dayOfMonth: 32 }, 'O dia do mês deve estar entre 1 e 31.'],
    ])('%o → %s', (config, message) => {
      const result = generate(config);
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors).toContain(message);
    });

    it('não gera expressão aparentemente válida para configuração inválida', () => {
      expect(generate({ hour: 99 })).not.toHaveProperty('expression');
    });

    it('ignora campos de horário em modalidades de intervalo', () => {
      expect(generate({ frequency: 'minutes', hour: 99 }).valid).toBe(true);
    });
  });

  it('todas as expressões geradas são aceitas pelo parser no modo Spring', () => {
    const configs: Partial<CronConfig>[] = [
      { frequency: 'daily' },
      { frequency: 'weekly', weekDays: [0, 6] },
      { frequency: 'monthly', dayOfMonth: 31 },
      { frequency: 'seconds', secondInterval: 1 },
      { frequency: 'minutes', minuteInterval: 20 },
      { frequency: 'hours', hourInterval: 8 },
    ];
    for (const config of configs) {
      const expression = expressionOf(generate(config));
      expect(expression).not.toBeNull();
      expect(validateCronExpression(expression!)).toBeNull();
    }
  });
});
