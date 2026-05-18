import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/dashboard/analytics-dashboard.component').then(
            m => m.AnalyticsDashboardComponent
          )
      },
      {
        path: 'goals',
        loadChildren: () =>
          import('./features/goals/goals.routes').then(m => m.goalRoutes)
      },
      {
        path: 'checkins',
        loadChildren: () =>
          import('./features/checkins/checkins.routes').then(m => m.checkinRoutes)
      },
      {
        path: 'shared-goals',
        loadChildren: () =>
          import('./features/shared-goals/shared-goals.routes').then(m => m.sharedGoalRoutes)
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then(m => m.reportRoutes)
      },
      {
        path: 'audit',
        loadChildren: () =>
          import('./features/audit/audit.routes').then(m => m.auditRoutes),
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] }
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes').then(m => m.profileRoutes)
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./features/admin/admin.routes').then(m => m.adminRoutes),
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN'] }
      }
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];