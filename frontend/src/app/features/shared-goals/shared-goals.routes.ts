import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const sharedGoalRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./shared-goals-list.component').then(m => m.SharedGoalsListComponent),
  },
  {
    path: 'assign',
    loadComponent: () =>
      import('./assign/assign-shared-goal.component').then(m => m.AssignSharedGoalComponent),
    canActivate: [roleGuard],
    data: { roles: ['ROLE_MANAGER', 'ROLE_ADMIN'] },
  },
];