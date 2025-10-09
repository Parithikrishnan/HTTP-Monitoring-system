// src/app/pages/dashboard/dashboard.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Required for [(ngModel)]
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

// Re-export the interface for clarity and external use
export interface RequestData {
  id: number | string;
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: string;
  requestBody?: string | null;
  requestHeaders?: { [key: string]: string | string[] };
  requestCookies?: string[];
  responseBody?: string | null;
  responseHeaders?: { [key: string]: string | string[] };
  responseCookies?: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  // Add FormsModule to imports for [(ngModel)] to work
  imports: [CommonModule, HttpClientModule, KeyValuePipe, FormsModule], 
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  // --- Core Data & State ---
  requestList: RequestData[] = [];
  filteredRequestList: RequestData[] = []; // List shown in the table
  
  fullDetailRequest?: RequestData; // Request currently displayed in full view
  showFullDetails: boolean = false; // Controls which view is active
  
  // --- Loading/Error States ---
  loading = false; 
  error: string | null = null; 
  loadingFullDetails: boolean = false;
  fullDetailsError: string | null = null;
  
  // --- Filter Properties (Matching HTML ngModel) ---
  filterTerm: string = '';
  filterStatus: 'all' | '2xx' | '3xx' | '4xx' | '5xx' = 'all';
  filterMethod: 'all' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' = 'all';

  private readonly API_BASE_URL = 'http://localhost:3000';

  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // Initial fetch of the list data
    this.fetchRequests();
  }

  /**
   * Fetches the initial list of requests from the API.
   * FIX: This now correctly calls a single list endpoint, assuming the list endpoint
   * returns enough data for the table and stats (minus the large bodies/headers).
   */
  fetchRequests(): void {
    this.loading = true;
    this.error = null;
    this.showFullDetails = false;

    // Use a simpler list endpoint, assuming it returns core RequestData fields
    this.http.get<RequestData[]>(`${this.API_BASE_URL}/requests`).pipe(
      // We don't need switchMap/forkJoin here, as we only load details on click
      catchError(overallError => {
        console.error('Error fetching request list:', overallError);
        this.error = 'Failed to load request data. Please ensure the backend server is running.';
        this.loading = false;
        return of([]); // Return an empty array on error to stop subscription
      })
    ).subscribe({
      next: (requests: RequestData[]) => {
        this.requestList = requests;
        this.loading = false;
        // Apply filters once data is loaded
        this.applyFilters(); 
      },
      error: (err) => {
        // This 'error' handler catches errors not caught by the pipe (rare, but good practice)
        console.error('Subscription error during list fetch:', err);
        this.error = this.error || 'An unexpected error occurred during list fetching.';
        this.loading = false;
      }
    });
  }

  /**
   * Implements the filtering logic based on user input.
   */
  applyFilters(): void {
    let tempRequests = this.requestList;

    // 1. Search Filter (URL or Method)
    if (this.filterTerm) {
      const term = this.filterTerm.toLowerCase();
      tempRequests = tempRequests.filter(req =>
        req.url.toLowerCase().includes(term) ||
        req.method.toLowerCase().includes(term)
      );
    }

    // 2. Status Filter
    if (this.filterStatus !== 'all') {
      const prefix = parseInt(this.filterStatus.charAt(0)); // e.g., '2' from '2xx'
      tempRequests = tempRequests.filter(req => 
        Math.floor(req.status / 100) === prefix
      );
    }

    // 3. Method Filter
    if (this.filterMethod !== 'all') {
      tempRequests = tempRequests.filter(req => 
        req.method === this.filterMethod
      );
    }

    this.filteredRequestList = tempRequests;
  }

  /**
   * Resets all filters to their default state.
   */
  clearFilters(): void {
    this.filterTerm = '';
    this.filterStatus = 'all';
    this.filterMethod = 'all';
    this.applyFilters();
  }

  /**
   * Switches to the full details view and fetches the complete request data.
   */
  viewFullDetails(req: RequestData): void {
    this.fullDetailRequest = undefined;
    this.loadingFullDetails = true;
    this.fullDetailsError = null;
    this.showFullDetails = true;

    // Fetch full details (including body/headers/cookies) for the selected request
    this.http.get<RequestData>(`${this.API_BASE_URL}/requests/${req.id}`).subscribe({
      next: (data) => {
        this.fullDetailRequest = data;
        this.loadingFullDetails = false;
      },
      error: (err) => {
        console.error('Error fetching full request details:', err);
        this.fullDetailsError = `Failed to load full details for request ID ${req.id}. Please ensure the backend server is running and the ID is valid.`;
        this.loadingFullDetails = false;
      }
    });
  }

  exitFullDetails(): void {
    this.showFullDetails = false;
    this.fullDetailRequest = undefined;
    this.fullDetailsError = null;
  }

  refreshNo(): void {
    this.fetchRequests();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']); // Assuming a login route
  }

  // --- HTML Helper Getters/Methods ---

  // NOTE: selectedRequest, selectRequest, clearSelection, and openDetailPage 
  // are largely redundant given the direct (click)="viewFullDetails(req)" in the HTML.
  // I've kept them minimal but they could be removed entirely.
  
  // The 'selected' class logic in HTML still uses selectedRequest?.id === req.id.
  selectedRequest?: RequestData;
  selectRequest(req: RequestData): void {
    // Only set a visual selection if not in full detail mode
    if (!this.showFullDetails) { 
      this.selectedRequest = req;
    }
  }
  
  // Stats getters use the *unfiltered* requestList for totals
  get totalRequests(): number {
    return this.requestList?.length || 0;
  }

  get successfulRequests(): number {
    return this.requestList?.filter(r => r.status >= 200 && r.status < 300).length || 0;
  }

  get failedRequests(): number {
    return this.requestList?.filter(r => r.status >= 400).length || 0;
  }
  
  // --- Formatting Functions ---
  
  shortUrl(url: string): string {
    if (!url) return '';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `http://fake.com${url}`);
      const pathname = urlObj.pathname;
      return pathname.length > 40 ? pathname.substring(0, 37) + '...' : pathname;
    } catch (e) {
      return url.length > 40 ? url.substring(0, 37) + '...' : url;
    }
  }

  getStatusClass(status: number): string {
    if (status >= 200 && status < 300) return 'status-2xx';
    if (status >= 300 && status < 400) return 'status-3xx';
    if (status >= 400 && status < 500) return 'status-4xx';
    if (status >= 500) return 'status-5xx';
    return 'status-default';
  }

  formatDate(ts: string): string {
    if (!ts) return 'N/A';
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return ts; // Return raw timestamp if date parsing fails
    }
  }

  formatCookies(cookies: string[] | undefined): string {
    if (!cookies || cookies.length === 0) {
      return 'None';
    }
    return cookies.join('\n');
  }

  formatJson(data: any): string {
    if (data === null || data === undefined || (typeof data === 'string' && data.trim() === '')) {
      return 'None';
    }
    try {
      const dataStr = String(data);
      // Attempt to parse only if it looks like JSON (starts with { or [)
      if (dataStr.trim().startsWith('{') || dataStr.trim().startsWith('[')) {
        const parsed = JSON.parse(dataStr);
        return JSON.stringify(parsed, null, 2);
      }
      // If not JSON, return the string content
      return dataStr;
    } catch (e) {
      // If parsing failed, return the original data as a string
      return String(data);
    }
  }
}