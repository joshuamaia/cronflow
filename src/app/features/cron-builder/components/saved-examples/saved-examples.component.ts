import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FREQUENCY_OPTIONS, type CronConfig } from '../../../../core/models/cron-config.model';
import type { SavedExampleDraft } from '../../../../core/models/saved-example.model';
import { CronDescriptionService } from '../../services/cron-description.service';
import { SavedExamplesService } from '../../services/saved-examples.service';
import {
  ExampleEditorDialogComponent,
  type ExampleEditorData,
} from '../example-editor-dialog/example-editor-dialog.component';

interface SavedExampleItem {
  id: string;
  title: string;
  subtitle: string;
  expression: string;
  icon: string;
  config: CronConfig;
}

const SNACKBAR = { duration: 4000, panelClass: 'cf-snackbar' };
const STORAGE_WARNING =
  'Não foi possível gravar no navegador. O exemplo ficará disponível só até recarregar a página.';

@Component({
  selector: 'app-saved-examples',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saved-examples.component.html',
  styleUrl: './saved-examples.component.scss',
})
export class SavedExamplesComponent {
  /** Configuração atual do construtor: ponto de partida de um novo exemplo. */
  readonly currentConfig = input.required<CronConfig>();
  readonly activeExpression = input<string | null>(null);
  readonly apply = output<CronConfig>();

  private readonly store = inject(SavedExamplesService);
  private readonly describer = inject(CronDescriptionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly persistent = this.store.persistent;
  protected readonly count = this.store.count;

  protected readonly items = computed<SavedExampleItem[]>(() =>
    this.store.examples().map((example) => {
      const expression = this.store.expressionOf(example) ?? '';
      return {
        id: example.id,
        title: example.title,
        subtitle: example.description || this.describer.describe(expression) || '',
        expression,
        icon: FREQUENCY_OPTIONS.find((option) => option.value === example.config.frequency)?.icon ?? 'schedule',
        config: example.config,
      };
    }),
  );

  create(): void {
    this.openEditor({ mode: 'create', config: this.currentConfig() }, (draft) => {
      const { example, persisted } = this.store.create(draft);
      this.apply.emit(example.config);
      this.notify(persisted ? `Exemplo "${example.title}" criado.` : STORAGE_WARNING);
    });
  }

  edit(id: string): void {
    const example = this.store.findById(id);
    if (!example) return;
    const data: ExampleEditorData = {
      mode: 'edit',
      title: example.title,
      description: example.description,
      config: example.config,
    };
    this.openEditor(data, (draft) => {
      const persisted = this.store.update(id, draft);
      this.notify(persisted ? 'Alterações salvas.' : STORAGE_WARNING);
    });
  }

  remove(id: string): void {
    const result = this.store.remove(id);
    if (!result) return;
    this.snackBar
      .open(`Exemplo "${result.removed.title}" excluído.`, 'Desfazer', SNACKBAR)
      .onAction()
      .subscribe(() => this.store.restore(result.removed, result.index));
  }

  private openEditor(data: ExampleEditorData, onSave: (draft: SavedExampleDraft) => void): void {
    this.dialog
      .open<ExampleEditorDialogComponent, ExampleEditorData, SavedExampleDraft>(
        ExampleEditorDialogComponent,
        {
          data,
          width: '760px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100dvh - 32px)',
          autoFocus: 'first-tabbable',
          panelClass: 'cf-dialog',
        },
      )
      .afterClosed()
      .subscribe((draft) => {
        if (draft) onSave(draft);
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, undefined, SNACKBAR);
  }
}

