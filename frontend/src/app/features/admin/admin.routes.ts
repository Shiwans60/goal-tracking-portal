import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cycle-management/cycle-management.component').then(m => m.CycleManagementComponent)
  }
];
