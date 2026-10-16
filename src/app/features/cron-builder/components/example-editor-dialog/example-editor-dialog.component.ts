import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, type AbstractControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { map } from 'rxjs';
import type { CronConfig, Frequency } from '../../../../core/models/cron-config.model';
import {
  EXAMPLE_DESCRIPTION_MAX_LENGTH,
  EXAMPLE_TITLE_MAX_LENGTH,
  type SavedExampleDraft,
} from '../../../../core/models/saved-example.model';
import { createScheduleForm } from '../../cron-builder.forms';
import { CronDescriptionService } from '../../services/cron-description.service';
import { CronGeneratorService } from '../../services/cron-generator.service';
import { FrequencySelectorComponent } from '../frequency-selector/frequency-selector.component';
import { ScheduleConfigComponent } from '../schedule-config/schedule-config.component';

export interface ExampleEditorData {
  mode: 'create' | 'edit';
  title?: string;
  description?: string;
  config: CronConfig;
}

const notBlank = (control: AbstractControl<string>) =>
  control.value.trim().length > 0 ? null : { blank: true };

/** Modal de criação/edição de um exemplo. Fecha devolvendo um `SavedExampleDraft`. */
@Component({
  selector: 'app-example-editor-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FrequencySelectorComponent,
    ScheduleConfigComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './example-editor-dialog.component.html',
  styleUrl: './example-editor-dialog.component.scss',
})
export class ExampleEditorDialogComponent {
  protected readonly data = inject<ExampleEditorData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExampleEditorDialogComponent, SavedExampleDraft>);
  private readonly generator = inject(CronGeneratorService);
  private readonly describer = inject(CronDescriptionService);
  private readonly fb = inject(FormBuilder);

  protected readonly titleMax = EXAMPLE_TITLE_MAX_LENGTH;
  protected readonly descriptionMax = EXAMPLE_DESCRIPTION_MAX_LENGTH;

  readonly detailsForm = this.fb.nonNullable.group({
    title: [
      this.data.title ?? '',
      [Validators.required, Validators.maxLength(EXAMPLE_TITLE_MAX_LENGTH), notBlank],
    ],
    description: [this.data.description ?? '', Validators.maxLength(EXAMPLE_DESCRIPTION_MAX_LENGTH)],
  });

  readonly scheduleForm = createScheduleForm(this.fb, this.data.config);

  readonly config = toSignal(
    this.scheduleForm.valueChanges.pipe(map(() => this.scheduleForm.getRawValue())),
    { initialValue: this.scheduleForm.getRawValue() },
  );
  private readonly details = toSignal(
    this.detailsForm.valueChanges.pipe(map(() => this.detailsForm.getRawValue())),
    { initialValue: this.detailsForm.getRawValue() },
  );
  private readonly detailsValid = toSignal(
    this.detailsForm.statusChanges.pipe(map((status) => status === 'VALID')),
    { initialValue: this.detailsForm.valid },
  );

  readonly generation = computed(() => this.generator.generate(this.config()));
  readonly expression = computed(() => {
    const generation = this.generation();
    return generation.valid ? generation.expression : null;
  });
  readonly preview = computed(() => {
    const expression = this.expression();
    return expression ? this.describer.describe(expression) : null;
  });
  readonly errors = computed(() => {
    const generation = this.generation();
    return generation.valid ? [] : generation.errors;
  });
  readonly titleLength = computed(() => this.details().title.length);
  readonly descriptionLength = computed(() => this.details().description.length);
  readonly canSave = computed(() => this.detailsValid() && this.generation().valid);

  setFrequency(frequency: Frequency): void {
    this.scheduleForm.controls.frequency.setValue(frequency);
  }

  save(): void {
    if (!this.canSave()) {
      this.detailsForm.markAllAsTouched();
      return;
    }
    const { title, description } = this.detailsForm.getRawValue();
    this.dialogRef.close({
      title: title.trim(),
      description: description.trim(),
      config: this.scheduleForm.getRawValue(),
    });
  }
}
