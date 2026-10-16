import { TestBed } from '@angular/core/testing';
import { MemoryStorage } from '../../../../testing/memory-storage';
import { DEFAULT_CRON_CONFIG, type CronConfig } from '../../../core/models/cron-config.model';
import type { SavedExampleDraft } from '../../../core/models/saved-example.model';
import {
  EXAMPLES_STORAGE,
  SAVED_EXAMPLES_STORAGE_KEY,
  SavedExamplesService,
} from './saved-examples.service';

const draft = (title: string, config: Partial<CronConfig> = {}): SavedExampleDraft => ({
  title,
  description: '',
  config: { ...DEFAULT_CRON_CONFIG, ...config },
});

describe('SavedExamplesService', () => {
  let storage: MemoryStorage;

  function createService(): SavedExamplesService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: EXAMPLES_STORAGE, useValue: storage }] });
    return TestBed.inject(SavedExamplesService);
  }

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('começa vazio', () => {
    expect(createService().examples()).toEqual([]);
  });

  it('cria exemplos sem limite de quantidade, mais recentes primeiro', () => {
    const service = createService();
    for (let i = 1; i <= 50; i++) service.create(draft(`Exemplo ${i}`));

    expect(service.count()).toBe(50);
    expect(service.examples()[0].title).toBe('Exemplo 50');
    expect(new Set(service.examples().map((e) => e.id)).size).toBe(50);
  });

  it('persiste e recarrega os exemplos', () => {
    const service = createService();
    service.create(draft('Backup noturno', { frequency: 'daily', hour: 2, minute: 0 }));

    const reloaded = createService();
    expect(reloaded.examples()).toHaveLength(1);
    expect(reloaded.examples()[0]).toMatchObject({
      title: 'Backup noturno',
      config: { frequency: 'daily', hour: 2, minute: 0 },
    });
  });

  it('gera a expressão a partir da configuração', () => {
    const service = createService();
    const { example } = service.create(
      draft('Dias úteis', { frequency: 'weekly', weekDays: [1, 2, 3, 4, 5], hour: 9, minute: 0 }),
    );
    expect(service.expressionOf(example)).toBe('0 0 9 * * MON-FRI');
  });

  it('edita um exemplo mantendo id e posição', () => {
    const service = createService();
    const { example: first } = service.create(draft('Primeiro'));
    service.create(draft('Segundo'));

    service.update(first.id, draft('Primeiro editado', { frequency: 'minutes', minuteInterval: 5 }));

    const edited = service.examples()[1];
    expect(edited.id).toBe(first.id);
    expect(edited.title).toBe('Primeiro editado');
    expect(service.expressionOf(edited)).toBe('0 */5 * * * *');
    expect(createService().examples()[1].title).toBe('Primeiro editado');
  });

  it('exclui e permite desfazer na posição original', () => {
    const service = createService();
    service.create(draft('A'));
    const { example: b } = service.create(draft('B'));
    service.create(draft('C'));

    const removed = service.remove(b.id);
    expect(service.examples().map((e) => e.title)).toEqual(['C', 'A']);
    expect(createService().count()).toBe(2);

    const restoredService = createService();
    restoredService.restore(removed!.removed, removed!.index);
    expect(restoredService.examples().map((e) => e.title)).toEqual(['C', 'B', 'A']);
  });

  it('normaliza nome e descrição e rejeita dados inválidos', () => {
    const service = createService();
    const { example } = service.create({ ...draft('  Relatório  '), description: '  Diário  ' });
    expect(example.title).toBe('Relatório');
    expect(example.description).toBe('Diário');

    expect(() => service.create(draft('   '))).toThrow();
    expect(() => service.create(draft('Sem dias', { frequency: 'weekly', weekDays: [] }))).toThrow();
    expect(service.count()).toBe(1);
  });

  it('descarta dados corrompidos ou inválidos ao carregar', () => {
    storage.setItem(
      SAVED_EXAMPLES_STORAGE_KEY,
      JSON.stringify([
        { id: 'ok', title: 'Válido', config: { frequency: 'hours', hourInterval: 6 } },
        { id: 'bad-hour', title: 'Hora 99', config: { frequency: 'daily', hour: 99 } },
        { id: '', title: 'Sem id', config: {} },
        { id: 'no-title', title: '', config: {} },
        'lixo',
      ]),
    );
    const service = createService();
    expect(service.examples().map((e) => e.id)).toEqual(['ok']);
    expect(service.expressionOf(service.examples()[0])).toBe('0 0 */6 * * *');

    storage.setItem(SAVED_EXAMPLES_STORAGE_KEY, '{não é json');
    expect(createService().examples()).toEqual([]);
  });

  it('mantém em memória quando o navegador recusa a gravação', () => {
    const service = createService();
    storage.failWrites = true;
    const { persisted } = service.create(draft('Sem espaço'));
    expect(persisted).toBe(false);
    expect(service.count()).toBe(1);
  });

  it('funciona sem armazenamento disponível', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: EXAMPLES_STORAGE, useValue: null }] });
    const service = TestBed.inject(SavedExamplesService);
    expect(service.persistent).toBe(false);
    expect(service.create(draft('Temporário')).persisted).toBe(false);
    expect(service.count()).toBe(1);
  });
});
