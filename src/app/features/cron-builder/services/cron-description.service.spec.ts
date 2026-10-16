import { CronDescriptionService, formatTime } from './cron-description.service';

describe('CronDescriptionService', () => {
  const service = new CronDescriptionService();

  it.each([
    ['* * * * * *', 'Executar a cada segundo'],
    ['*/5 * * * * *', 'Executar a cada 5 segundos'],
    ['0 * * * * *', 'Executar a cada minuto'],
    ['0 */15 * * * *', 'Executar a cada 15 minutos'],
    ['0 0 * * * *', 'Executar a cada hora'],
    ['0 0 */2 * * *', 'Executar a cada 2 horas'],
    ['0 30 8 * * *', 'Executar todos os dias às 08h30'],
    ['0 0 9 * * MON-FRI', 'Executar de segunda a sexta-feira às 09h'],
    ['0 0 6 10 * *', 'Executar no dia 10 de cada mês às 06h'],
  ])('%s → %s', (expression, description) => {
    expect(service.describe(expression)).toBe(description);
  });

  it('descreve segundos não nulos', () => {
    expect(service.describe('15 30 8 * * *')).toBe('Executar todos os dias às 08h30min15s');
  });

  it('descreve um único dia com o artigo correto', () => {
    expect(service.describe('0 0 9 * * MON')).toBe('Executar toda segunda-feira às 09h');
    expect(service.describe('0 0 9 * * SAT')).toBe('Executar todo sábado às 09h');
  });

  it('descreve listas de dias', () => {
    expect(service.describe('0 0 9 * * MON,WED,FRI')).toBe(
      'Executar nos dias segunda-feira, quarta-feira e sexta-feira, às 09h',
    );
    expect(service.describe('0 0 10 * * SUN,SAT')).toBe('Executar nos dias domingo e sábado, às 10h');
  });

  it('descreve intervalos de dias começando no domingo', () => {
    expect(service.describe('0 0 7 * * SUN-TUE')).toBe('Executar de domingo a terça-feira às 07h');
  });

  it('retorna null para formatos fora do construtor', () => {
    expect(service.describe('0 0 9 * *')).toBeNull();
    expect(service.describe('0 0 9 * 1 *')).toBeNull();
    expect(service.describe('0 0 9 L * *')).toBeNull();
  });

  it('formata horários', () => {
    expect(formatTime(0, 0, 0)).toBe('00h');
    expect(formatTime(8, 5, 0)).toBe('08h05');
    expect(formatTime(8, 0, 9)).toBe('08h00min09s');
  });
});
