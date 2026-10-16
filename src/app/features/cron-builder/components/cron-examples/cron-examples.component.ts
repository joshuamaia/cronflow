import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CRON_EXAMPLES, type CronExample } from './cron-examples';

@Component({
  selector: 'app-cron-examples',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="examples-title">
      <h2 id="examples-title" class="title">
        <mat-icon>auto_awesome</mat-icon>
        Experimente um exemplo
      </h2>
      <div class="examples">
        @for (example of examples; track example.id; let i = $index) {
          <button
            type="button"
            class="example"
            [class.active]="example.expression === activeExpression()"
            [attr.aria-pressed]="example.expression === activeExpression()"
            (click)="selected.emit(example)"
          >
            <span class="head">
              <mat-icon>{{ example.icon }}</mat-icon>
              <span class="name">Exemplo {{ i + 1 }} — {{ example.title }}</span>
            </span>
            <code>{{ example.expression }}</code>
            <span class="description">{{ example.description }}</span>
          </button>
        }
      </div>
    </section>
  `,
  styleUrl: './cron-examples.component.scss',
})
export class CronExamplesComponent {
  readonly activeExpression = input<string | null>(null);
  readonly selected = output<CronExample>();

  protected readonly examples = CRON_EXAMPLES;
}
