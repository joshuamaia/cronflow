import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { createFakeWorkerFactory } from '../../../testing/fake-simulation-worker';
import { appConfig } from '../../app.config';
import { CRON_WORKER_FACTORY } from '../../core/services/cron-worker-manager.service';
import { CronBuilderComponent } from './cron-builder.component';
import { SIMULATION_DEBOUNCE_MS } from './services/cron-simulator.service';
import { MemoryStorage } from '../../../testing/memory-storage';
import { EXAMPLES_STORAGE, SAVED_EXAMPLES_STORAGE_KEY } from './services/saved-examples.service';

describe('CronBuilderComponent', () => {
  let fixture: ComponentFixture<CronBuilderComponent>;
  let component: CronBuilderComponent;
  let fake: ReturnType<typeof createFakeWorkerFactory>;
  let storage: MemoryStorage;

  const text = (selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent?.trim() ?? '';
  const all = (selector: string) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(selector));

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    fake = createFakeWorkerFactory('auto');
    storage = new MemoryStorage();
    TestBed.configureTestingModule({
      imports: [CronBuilderComponent],
      providers: [
        ...appConfig.providers,
        { provide: CRON_WORKER_FACTORY, useValue: fake.factory },
        { provide: SIMULATION_DEBOUNCE_MS, useValue: 0 },
        { provide: EXAMPLES_STORAGE, useValue: storage },
      ],
    });
    fixture = TestBed.createComponent(CronBuilderComponent);
    component = fixture.componentInstance;
    await settle();
  });

  it('gera a expressão, a descrição e o padrão de período', () => {
    expect(text('.expression code')).toBe('0 30 8 * * *');
    expect(text('app-cron-result .description span')).toBe('Executar todos os dias às 08h30');

    const { start, end, limit } = component.periodForm.getRawValue();
    expect(limit).toBe(10);
    expect(end!.getTime() - start!.getTime()).toBeGreaterThanOrEqual(29 * 86_400_000);
  });

  it('simula no Worker e renderiza a quantidade solicitada', async () => {
    await vi.waitFor(async () => {
      await settle();
      expect(all('.timeline .item')).toHaveLength(10);
    });
    expect(fake.workers).toHaveLength(1);
    expect(text('.timeline .item .time')).toContain('08:30:00');
  });

  it('aplica um exemplo e atualiza construtor, expressão, descrição e simulação', async () => {
    const example = all('app-cron-examples button').find((button) =>
      button.textContent?.includes('Dias úteis'),
    );
    example!.click();
    await settle();

    expect(component.config().frequency).toBe('weekly');
    expect(text('.expression code')).toBe('0 0 9 * * MON-FRI');
    expect(text('app-cron-result .description span')).toBe('Executar de segunda a sexta-feira às 09h');

    await vi.waitFor(async () => {
      await settle();
      const posted = fake.workers.flatMap((worker) => worker.received);
      expect(posted.at(-1)?.request.expression).toBe('0 0 9 * * MON-FRI');
      expect(all('.timeline .item').length).toBeGreaterThan(0);
    });
    const weekdays = all('.timeline .weekday').map((el) => el.textContent?.trim());
    expect(weekdays).not.toContain('Sábado');
    expect(weekdays).not.toContain('Domingo');
  });

  it('exemplo de alta frequência limita a 20 resultados em um período de 1.000 anos', async () => {
    all('app-cron-examples button')
      .find((button) => button.textContent?.includes('Alta frequência'))!
      .click();
    component.periodForm.setValue({
      start: new Date(2000, 0, 1),
      end: new Date(2999, 11, 31),
      limit: 20,
    });

    await vi.waitFor(async () => {
      await settle();
      expect(all('.timeline .item')).toHaveLength(20);
    });
    expect(text('.expression code')).toBe('* * * * * *');
  });

  it('desabilita a cópia e mostra a validação para configuração inválida', async () => {
    component.setFrequency('weekly');
    component.scheduleForm.controls.weekDays.setValue([]);
    await settle();

    expect(text('.expression code')).toBe('— — — — — —');
    expect(text('.errors')).toContain('Selecione pelo menos um dia da semana.');
    const copy = all('app-cron-result button').at(-1) as HTMLButtonElement;
    expect(copy.disabled).toBe(true);
    expect(text('app-execution-timeline .status strong')).toBe('Configuração inválida');
  });

  it('indica período fora do suporte sem iniciar cálculo', async () => {
    await vi.waitFor(async () => {
      await settle();
      expect(all('.timeline .item')).toHaveLength(10);
    });
    const before = fake.workers.flatMap((worker) => worker.received).length;
    component.periodForm.controls.end.setValue(new Date(3026, 9, 16));
    await settle();

    expect(text('app-execution-timeline .status p')).toContain('fora do intervalo suportado');
    expect(fake.workers.flatMap((worker) => worker.received).length).toBe(before);
  });
});

describe('CronBuilderComponent — meus exemplos', () => {
  let fixture: ComponentFixture<CronBuilderComponent>;
  let component: CronBuilderComponent;
  let storage: MemoryStorage;

  const root = () => fixture.nativeElement as HTMLElement;
  const overlay = () => document.querySelector('.cdk-overlay-container') as HTMLElement;
  const rows = () => Array.from(root().querySelectorAll<HTMLElement>('app-saved-examples .row'));
  const buttonByText = (scope: HTMLElement, label: string) =>
    Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes(label),
    )!;

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function createComponent() {
    TestBed.configureTestingModule({
      imports: [CronBuilderComponent],
      providers: [
        ...appConfig.providers,
        { provide: CRON_WORKER_FACTORY, useValue: createFakeWorkerFactory('auto').factory },
        { provide: SIMULATION_DEBOUNCE_MS, useValue: 0 },
        { provide: EXAMPLES_STORAGE, useValue: storage },
      ],
    });
    fixture = TestBed.createComponent(CronBuilderComponent);
    component = fixture.componentInstance;
    await settle();
  }

  async function fillAndSubmit(title: string) {
    const input = overlay().querySelector<HTMLInputElement>('input[formcontrolname="title"]')!;
    input.value = title;
    input.dispatchEvent(new Event('input'));
    await settle();
    buttonByText(overlay(), 'Criar exemplo').click();
    await settle();
  }

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  afterEach(() => {
    overlay()?.replaceChildren();
  });

  it('mostra estado vazio quando não há exemplos criados', async () => {
    await createComponent();
    expect(root().querySelector('app-saved-examples .empty')).not.toBeNull();
  });

  it('cria um exemplo pelo modal a partir da configuração atual', async () => {
    await createComponent();
    component.applyConfig({ frequency: 'hours', hourInterval: 6 });
    await settle();

    buttonByText(root(), 'Novo exemplo').click();
    await settle();
    expect(overlay().querySelector('h2')?.textContent).toContain('Novo exemplo');
    expect(overlay().querySelector('.preview code')?.textContent).toBe('0 0 */6 * * *');

    await fillAndSubmit('Sincronização');

    await vi.waitFor(async () => {
      await settle();
      expect(rows()).toHaveLength(1);
    });
    expect(rows()[0].querySelector('.title')?.textContent).toBe('Sincronização');
    expect(rows()[0].querySelector('code')?.textContent).toBe('0 0 */6 * * *');
    expect(rows()[0].classList).toContain('active');
    expect(JSON.parse(storage.getItem(SAVED_EXAMPLES_STORAGE_KEY)!)).toHaveLength(1);
  });

  it('lista exemplos salvos e aplica ao clicar', async () => {
    storage.setItem(
      SAVED_EXAMPLES_STORAGE_KEY,
      JSON.stringify([
        { id: 'a', title: 'Relatório mensal', description: '', config: { frequency: 'monthly', dayOfMonth: 5, hour: 7, minute: 0, second: 0 } },
        { id: 'b', title: 'Heartbeat', description: 'Checagem rápida', config: { frequency: 'seconds', secondInterval: 30 } },
      ]),
    );
    await createComponent();

    expect(rows().map((row) => row.querySelector('.title')?.textContent)).toEqual([
      'Relatório mensal',
      'Heartbeat',
    ]);
    // Sem descrição própria, usa a interpretação automática.
    expect(rows()[0].querySelector('.subtitle')?.textContent).toBe('Executar no dia 5 de cada mês às 07h');
    expect(rows()[1].querySelector('.subtitle')?.textContent).toBe('Checagem rápida');

    rows()[0].querySelector<HTMLButtonElement>('.apply')!.click();
    await settle();
    expect(component.expression()).toBe('0 0 7 5 * *');
    expect(rows()[0].classList).toContain('active');
  });

  it('edita um exemplo no modal', async () => {
    storage.setItem(
      SAVED_EXAMPLES_STORAGE_KEY,
      JSON.stringify([{ id: 'a', title: 'Antigo', description: '', config: { frequency: 'daily', hour: 8, minute: 0, second: 0 } }]),
    );
    await createComponent();

    rows()[0].querySelector<HTMLButtonElement>('button[aria-label^="Editar"]')!.click();
    await settle();
    expect(overlay().querySelector('h2')?.textContent).toContain('Editar exemplo');
    const input = overlay().querySelector<HTMLInputElement>('input[formcontrolname="title"]')!;
    expect(input.value).toBe('Antigo');

    input.value = 'Novo nome';
    input.dispatchEvent(new Event('input'));
    await settle();
    buttonByText(overlay(), 'Salvar alterações').click();

    await vi.waitFor(async () => {
      await settle();
      expect(rows()[0].querySelector('.title')?.textContent).toBe('Novo nome');
    });
    expect(JSON.parse(storage.getItem(SAVED_EXAMPLES_STORAGE_KEY)!)[0].title).toBe('Novo nome');
  });

  it('exclui um exemplo e permite desfazer', async () => {
    storage.setItem(
      SAVED_EXAMPLES_STORAGE_KEY,
      JSON.stringify([{ id: 'a', title: 'Temporário', description: '', config: { frequency: 'minutes', minuteInterval: 10 } }]),
    );
    await createComponent();

    rows()[0].querySelector<HTMLButtonElement>('button[aria-label^="Excluir"]')!.click();
    await settle();
    expect(rows()).toHaveLength(0);

    buttonByText(overlay(), 'Desfazer').click();
    await settle();
    expect(rows()).toHaveLength(1);
  });
});
