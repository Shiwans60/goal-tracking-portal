import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'cycles',
    pathMatch: 'full',
  },
  {
    path: 'cycles',
    loadComponent: () =>
      import('./cycle-management/cycle-management.component').then(
        m => m.CycleManagementComponent,
      ),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./user-management/user-management.component').then(
        m => m.UserManagementComponent,
      ),
  },
  {
    path: 'org-chart',
    loadComponent: () =>
      import('./org-chart/org-chart.component').then(
        m => m.OrgChartComponent,
      ),
  },
];