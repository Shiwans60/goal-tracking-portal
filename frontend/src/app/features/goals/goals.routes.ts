import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const goalRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./goal-list/goal-list.component').then(m => m.GoalListComponent)
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./goal-form/goal-form.component').then(m => m.GoalFormComponent)
  },
  {
    path: 'team',
    loadComponent: () =>
      import('./manager-review/manager-review.component').then(m => m.ManagerReviewComponent),
    canActivate: [roleGuard],
    data: { roles: ['ROLE_MANAGER', 'ROLE_ADMIN'] }
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./goal-form/goal-form.component').then(m => m.GoalFormComponent)
  }
];