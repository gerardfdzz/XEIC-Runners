import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'XEIC RUNNERS · El club de running de La Sénia',
  },
  {
    path: 'fundadors',
    loadComponent: () =>
      import('./features/fundadors/fundadors.component').then((m) => m.FundadorsComponent),
    title: 'Fundadors · XEIC RUNNERS',
  },
  {
    path: 'esdeveniments',
    loadComponent: () =>
      import('./features/esdeveniments/esdeveniments.component').then((m) => m.EsdevenimentsComponent),
    title: 'Esdeveniments · XEIC RUNNERS',
  },
  {
    path: 'rutes',
    loadComponent: () =>
      import('./features/rutes/rutes.component').then((m) => m.RutesComponent),
    title: 'Rutes · XEIC RUNNERS',
  },
  {
    path: 'comunitat',
    loadComponent: () =>
      import('./features/comunitat/comunitat.component').then((m) => m.ComunitatComponent),
    title: 'Comunitat · XEIC RUNNERS',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
