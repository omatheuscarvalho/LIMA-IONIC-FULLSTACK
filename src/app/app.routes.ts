import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'register',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'history',
    loadComponent: () => import('./history/history.page').then( m => m.HistoryPage),
  },
  {
    path: 'help',
    loadComponent: () => import('./help/help.page').then( m => m.HelpPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
