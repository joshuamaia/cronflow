import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"><mat-icon>schedule</mat-icon></span>
        <div>
          <h1>Cron<span>Flow</span></h1>
          <p>Crie, visualize e simule expressões CRON.</p>
        </div>
      </div>
      <span class="stack-badge">Angular • Spring CRON</span>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {}
