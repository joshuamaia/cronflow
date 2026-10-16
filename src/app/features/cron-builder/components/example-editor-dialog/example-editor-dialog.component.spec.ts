import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DEFAULT_CRON_CONFIG } from '../../../../core/models/cron-config.model';
import {
  ExampleEditorDialogComponent,
  type ExampleEditorData,
} from './example-editor-dialog.component';

describe('ExampleEditorDialogComponent', () => {
  let fixture: ComponentFixture<ExampleEditorDialogComponent>;
  let component: ExampleEditorDialogComponent;
  const close = vi.fn();

  async function setup(data: ExampleEditorData) {
    close.mockReset();
    TestBed.configureTestingModule({
      imports: [ExampleEditorDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    fixture = TestBed.createComponent(ExampleEditorDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  const text = (selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent?.trim() ?? '';

  it('começa com a configuração recebida e exige um nome', async () => {
    await setup({ mode: 'create', config: { ...DEFAULT_CRON_CONFIG, hour: 7, minute: 0 } });

    expect(text('h2')).toBe('Novo exemplo');
    expect(text('.preview code')).toBe('0 0 7 * * *');
    expect(component.canSave()).toBe(false);

    component.save();
    expect(close).not.toHaveBeenCalled();
  });

  it('atualiza a prévia ao mudar a configuração', async () => {
    await setup({ mode: 'create', config: DEFAULT_CRON_CONFIG });
    component.setFrequency('minutes');
    component.scheduleForm.controls.minuteInterval.setValue(5);
    await fixture.whenStable();

    expect(text('.preview code')).toBe('0 */5 * * * *');
    expect(text('.preview span')).toBe('Executar a cada 5 minutos');
  });

  it('não salva com nome em branco ou configuração inválida', async () => {
    await setup({ mode: 'create', config: DEFAULT_CRON_CONFIG });
    component.detailsForm.controls.title.setValue('   ');
    expect(component.canSave()).toBe(false);

    component.detailsForm.controls.title.setValue('Semanal');
    component.setFrequency('weekly');
    component.scheduleForm.controls.weekDays.setValue([]);
    await fixture.whenStable();
    expect(component.canSave()).toBe(false);
    expect(text('.preview .error')).toBe('Selecione pelo menos um dia da semana.');
  });

  it('devolve nome, descrição e configuração ao salvar', async () => {
    await setup({
      mode: 'edit',
      title: 'Backup',
      description: '',
      config: { ...DEFAULT_CRON_CONFIG, frequency: 'daily', hour: 2, minute: 0 },
    });
    expect(text('h2')).toBe('Editar exemplo');

    component.detailsForm.setValue({ title: '  Backup noturno ', description: ' Às 02h ' });
    component.save();

    expect(close).toHaveBeenCalledWith({
      title: 'Backup noturno',
      description: 'Às 02h',
      config: expect.objectContaining({ frequency: 'daily', hour: 2, minute: 0 }),
    });
  });
});
