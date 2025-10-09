// src/app/pages/login/login.ts
import { Component, OnInit } from '@angular/core'; // Add OnInit for potential initial check
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  imports: [FormsModule, CommonModule]
})
export class LoginComponent implements OnInit { // Implement OnInit
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  loading: boolean = false;

  private readonly validUsername: string = 'admin';
  private readonly validPassword: string = '12345';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Optional: If already logged in, redirect to dashboard.
    // This helps catch cases where user navigates directly to login while authenticated.
    if (localStorage.getItem('isLoggedIn') === 'true') {
      this.router.navigate(['/dashboard']);
    }
  }

  onInputChange(): void {
    this.errorMessage = '';
  }

  onLogin(): void {
    this.loading = true;
    this.errorMessage = ''; // Clear previous errors

    setTimeout(() => {
      if (this.username === this.validUsername && this.password === this.validPassword) {
        localStorage.setItem('isLoggedIn', 'true'); // <--- IMPORTANT: Use 'isLoggedIn' for consistency
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Invalid username or password';
      }
      this.loading = false;
    }, 800);
  }
}