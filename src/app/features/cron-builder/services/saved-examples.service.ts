import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import {
  DEFAULT_CRON_CONFIG,
  type CronConfig,
  type WeekDay,
} from '../../../core/models/cron-config.model';
import {
  EXAMPLE_DESCRIPTION_MAX_LENGTH,
  EXAMPLE_TITLE_MAX_LENGTH,
  type SavedExample,
  type SavedExampleDraft,
} from '../../../core/models/saved-example.model';
import { CronGeneratorService } from './cron-generator.service';

export const SAVED_EXAMPLES_STORAGE_KEY = 'cronflow.saved-examples.v1';

/** Armazenamento usado para os exemplos; `null` quando o navegador o bloqueia. */
export const EXAMPLES_STORAGE = new InjectionToken<Storage | null>('EXAMPLES_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Exemplos criados pelo usuário, sem limite de quantidade, persistidos no navegador.
 * O estado vive em um Signal; cada alteração é gravada imediatamente.
 */
@Injectable({ providedIn: 'root' })
export class SavedExamplesService {
  private readonly storage = inject(EXAMPLES_STORAGE);
  private readonly generator = inject(CronGeneratorService);

  private readonly state = signal<SavedExample[]>(this.load());

  /** Mais recentes primeiro. */
  readonly examples = this.state.asReadonly();
  readonly count = computed(() => this.state().length);

  /** Indica se os dados estão sendo gravados no navegador. */
  readonly persistent = this.storage !== null;

  /** Cria um exemplo. Retorna `false` se não foi possível gravar no navegador. */
  create(draft: SavedExampleDraft): { example: SavedExample; persisted: boolean } {
    const now = Date.now();
    const example: SavedExample = {
      id: createId(),
      ...this.normalizeDraft(draft),
      createdAt: now,
      updatedAt: now,
    };
    this.state.update((list) => [example, ...list]);
    return { example, persisted: this.persist() };
  }

  update(id: string, draft: SavedExampleDraft): boolean {
    this.state.update((list) =>
      list.map((example) =>
        example.id === id
          ? { ...example, ...this.normalizeDraft(draft), updatedAt: Date.now() }
          : example,
      ),
    );
    return this.persist();
  }

  /** Remove e devolve o exemplo removido (para permitir "Desfazer"). */
  remove(id: string): { removed: SavedExample; index: number } | null {
    const list = this.state();
    const index = list.findIndex((example) => example.id === id);
    if (index < 0) return null;
    const removed = list[index];
    this.state.set(list.filter((example) => example.id !== id));
    this.persist();
    return { removed, index };
  }

  /** Reinsere um exemplo removido na posição original. */
  restore(example: SavedExample, index: number): void {
    this.state.update((list) => {
      if (list.some((item) => item.id === example.id)) return list;
      const next = [...list];
      next.splice(Math.min(index, next.length), 0, example);
      return next;
    });
    this.persist();
  }

  findById(id: string): SavedExample | undefined {
    return this.state().find((example) => example.id === id);
  }

  /** Expressão gerada para o exemplo (sempre válida para exemplos salvos). */
  expressionOf(example: SavedExample): string | null {
    const generation = this.generator.generate(example.config);
    return generation.valid ? generation.expression : null;
  }

  private normalizeDraft(draft: SavedExampleDraft): SavedExampleDraft {
    const title = draft.title.trim().slice(0, EXAMPLE_TITLE_MAX_LENGTH);
    const description = draft.description.trim().slice(0, EXAMPLE_DESCRIPTION_MAX_LENGTH);
    if (!title) throw new Error('O nome do exemplo é obrigatório.');

    const errors = this.generator.validate(draft.config);
    if (errors.length > 0) throw new Error(errors[0]);

    return { title, description, config: { ...draft.config, weekDays: [...draft.config.weekDays] } };
  }

  private persist(): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(SAVED_EXAMPLES_STORAGE_KEY, JSON.stringify(this.state()));
      return true;
    } catch {
      // Cota excedida ou armazenamento bloqueado: mantém em memória.
      return false;
    }
  }

  /** Lê os exemplos gravados, descartando entradas corrompidas ou inválidas. */
  private load(): SavedExample[] {
    if (!this.storage) return [];
    try {
      const raw = this.storage.getItem(SAVED_EXAMPLES_STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => this.parseExample(item))
        .filter((item): item is SavedExample => item !== null);
    } catch {
      return [];
    }
  }

  private parseExample(value: unknown): SavedExample | null {
    if (!isRecord(value) || !isRecord(value['config'])) return null;
    const { id, title, description, createdAt, updatedAt } = value;
    if (typeof id !== 'string' || !id) return null;
    if (typeof title !== 'string' || !title.trim()) return null;

    const stored = value['config'];
    const config: CronConfig = { ...DEFAULT_CRON_CONFIG };
    for (const key of Object.keys(DEFAULT_CRON_CONFIG) as (keyof CronConfig)[]) {
      if (key in stored) (config as unknown as Record<string, unknown>)[key] = stored[key];
    }
    if (!Array.isArray(config.weekDays)) return null;
    config.weekDays = (config.weekDays as unknown[]).filter(
      (day): day is WeekDay => Number.isInteger(day) && (day as number) >= 0 && (day as number) <= 6,
    );
    if (this.generator.validate(config).length > 0) return null;

    return {
      id,
      title: title.trim().slice(0, EXAMPLE_TITLE_MAX_LENGTH),
      description:
        typeof description === 'string'
          ? description.trim().slice(0, EXAMPLE_DESCRIPTION_MAX_LENGTH)
          : '',
      config,
      createdAt: typeof createdAt === 'number' ? createdAt : 0,
      updatedAt: typeof updatedAt === 'number' ? updatedAt : 0,
    };
  }
}

function createId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
