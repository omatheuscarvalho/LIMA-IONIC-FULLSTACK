import { Routes } from '@angular/router';
import { AuthGuard, NoAuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.page').then(m => m.LoginPage),
    canActivate: [NoAuthGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.page').then(m => m.RegisterPage),
    canActivate: [NoAuthGuard]
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'history',
    loadComponent: () => import('./history/history.page').then( m => m.HistoryPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'help',
    loadComponent: () => import('./help/help.page').then( m => m.HelpPage),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
