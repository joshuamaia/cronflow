import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'CronFlow — Visual Cron Scheduler',
    loadComponent: () =>
      import('./features/cron-builder/cron-builder.component').then((m) => m.CronBuilderComponent),
  },
  { path: '**', redirectTo: '' },
];
