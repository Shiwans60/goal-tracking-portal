import { Routes } from '@angular/router';

export const reportRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./report-list/report-list.component').then(m => m.ReportListComponent)
  }
];
