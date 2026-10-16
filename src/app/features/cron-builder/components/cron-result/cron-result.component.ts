import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { CronGenerationResult } from '../../services/cron-generator.service';

const FIELD_LABELS = ['segundo', 'minuto', 'hora', 'dia do mês', 'mês', 'dia da semana'];

@Component({
  selector: 'app-cron-result',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cron-result.component.html',
  styleUrl: './cron-result.component.scss',
})
export class CronResultComponent {
  readonly generation = input.required<CronGenerationResult>();
  readonly description = input<string | null>(null);

  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly expression = computed(() => {
    const generation = this.generation();
    return generation.valid ? generation.expression : null;
  });

  protected readonly errors = computed(() => {
    const generation = this.generation();
    return generation.valid ? [] : generation.errors;
  });

  /** Campos da expressão com seus rótulos, para a legenda abaixo da expressão. */
  protected readonly fields = computed(() =>
    (this.expression()?.split(' ') ?? []).map((value, index) => ({
      value,
      label: FIELD_LABELS[index],
    })),
  );

  protected copy(): void {
    const expression = this.expression();
    if (!expression) return;
    const copied = this.clipboard.copy(expression);
    this.snackBar.open(
      copied ? 'Expressão copiada com sucesso.' : 'Não foi possível copiar a expressão.',
      undefined,
      { duration: 2500, panelClass: 'cf-snackbar' },
    );
  }
}
