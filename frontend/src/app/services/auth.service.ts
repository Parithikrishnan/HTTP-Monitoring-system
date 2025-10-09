// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router'; // Inject Router for logout redirection if needed

@Injectable({
  providedIn: 'root' // Provided in root makes it a singleton across the app
})
export class AuthService {
  private readonly IS_LOGGED_IN_KEY = 'isLoggedIn';

  constructor(private router: Router) { } // Inject Router if logout also navigates

  // No 'login' method here anymore, as LoginComponent handles it directly

  logout(): void {
    localStorage.removeItem(this.IS_LOGGED_IN_KEY); // Clear authentication status
    console.log('AuthService: User logged out, localStorage cleared.');
    // Optional: Navigate to login after logout, if not handled by component
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const loggedIn = localStorage.getItem(this.IS_LOGGED_IN_KEY) === 'true'; // Read authentication status
    console.log('AuthService: isLoggedIn check:', loggedIn); // For debugging
    return loggedIn;
  }
}