// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard'; // <--- IMPORT loginGuard
import { RequestDetailsComponent } from './pages/request-details/request-details'; // Assuming you have this

export const routes: Routes = [
  // If user is already logged in, this will redirect to dashboard
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] }, // <--- Apply loginGuard here

  // Protected route: user must be authenticated to access dashboard
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  // Protected route for request details
  { path: 'request-detail/:id', component: RequestDetailsComponent, canActivate: [authGuard] },

  // Default redirect: If not logged in, this will go to login (which loginGuard then handles)
  // If already logged in, this will go to login, then loginGuard redirects to dashboard
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // <--- Redirect to dashboard by default

  // Wildcard route for any unknown paths - redirects to dashboard (which authGuard/loginGuard will handle)
  { path: '**', redirectTo: 'dashboard' }
];