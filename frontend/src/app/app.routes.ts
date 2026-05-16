import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'goals',
    loadChildren: () =>
      import('./features/goals/goals.routes').then(m => m.goalRoutes),
    canActivate: [authGuard]
  },
  {
    path: 'checkins',
    loadChildren: () =>
      import('./features/checkins/checkins.routes').then(m => m.checkinRoutes),
    canActivate: [authGuard]
  },
  {
    path: 'reports',
    loadChildren: () =>
      import('./features/reports/reports.routes').then(m => m.reportRoutes),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
