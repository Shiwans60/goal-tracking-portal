import { Routes } from '@angular/router';

export const checkinRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./checkin-list/checkin-list.component').then(m => m.CheckinListComponent)
  }
];
