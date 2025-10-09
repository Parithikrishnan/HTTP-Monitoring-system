// src/app/app.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common'; // For ngIf, ngFor etc.

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent {
  title = 'My Professional App';
  isAuthenticated: boolean = false; // Example authentication state

  // This would typically come from an authentication service
  constructor() {
    // For demonstration, set isAuthenticated to true after a short delay
    // In a real app, this would be managed by a service checking a token etc.
    setTimeout(() => {
      this.isAuthenticated = true; // Simulating a logged-in state
    }, 100);
  }

  logout() {
    console.log('User logged out');
    this.isAuthenticated = false; // Or navigate to login page
    // Implement actual logout logic here (e.g., clear tokens)
  }
}