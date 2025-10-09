// src/app/guards/login.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Adjust path if necessary

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // User is logged in, redirect to dashboard
    return router.createUrlTree(['/dashboard']);
  } else {
    // User is not logged in, allow access to login page
    return true;
  }
};