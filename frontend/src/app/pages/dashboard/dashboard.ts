// src/app/pages/dashboard/dashboard.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, throwError } from 'rxjs';
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
  imports: [CommonModule, HttpClientModule, KeyValuePipe, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  // --- Core Data & State ---
  requestList: RequestData[] = [];
  filteredRequestList: RequestData[] = [];

  fullDetailRequest?: RequestData;
  showFullDetails: boolean = false;

  // --- Loading/Error States ---
  loading = false;
  error: string | null = null;
  loadingFullDetails: boolean = false;
  fullDetailsError: string | null = null;

  // --- Filter Properties (Matching HTML ngModel) ---
  filterTerm: string = '';
  filterStatus: 'all' | '2xx' | '3xx' | '4xx' | '5xx' = 'all';
  filterMethod: 'all' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' = 'all';

  // Hardcoded API Base URL - As requested, without environment files
  private readonly API_BASE_URL = 'http://10.110.120.236:3000';

  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.fetchRequests();
  }

  fetchRequests(): void {
    this.loading = true;
    this.error = null;
    this.showFullDetails = false;

    this.http.get<RequestData[]>(`${this.API_BASE_URL}/requests`).pipe(
      catchError(this.handleError<RequestData[]>('fetchRequests', []))
    ).subscribe({
      next: (requests: RequestData[]) => {
        this.requestList = requests;
        this.loading = false;
        this.applyFilters();
      },
      error: (err) => {
        // handleError already sets `this.error` and `this.loading`
        console.error('Subscription error after handleError for list:', err);
      }
    });
  }

  applyFilters(): void {
    let tempRequests = this.requestList;

    if (this.filterTerm) {
      const term = this.filterTerm.toLowerCase();
      tempRequests = tempRequests.filter(req =>
        req.url.toLowerCase().includes(term) ||
        req.method.toLowerCase().includes(term) ||
        String(req.status).includes(term)
      );
    }

    if (this.filterStatus !== 'all') {
      const prefix = parseInt(this.filterStatus.charAt(0));
      tempRequests = tempRequests.filter(req =>
        Math.floor(req.status / 100) === prefix
      );
    }

    if (this.filterMethod !== 'all') {
      tempRequests = tempRequests.filter(req => req.method === this.filterMethod);
    }

    this.filteredRequestList = tempRequests;
  }

  clearFilters(): void {
    this.filterTerm = '';
    this.filterStatus = 'all';
    this.filterMethod = 'all';
    this.applyFilters();
  }

  viewFullDetails(req: RequestData): void {
    this.fullDetailRequest = undefined;
    this.loadingFullDetails = true;
    this.fullDetailsError = null;
    this.showFullDetails = true;

    this.http.get<RequestData>(`${this.API_BASE_URL}/requests/${req.id}`).pipe(
      catchError(this.handleError<RequestData>('viewFullDetails', undefined, true, `details for request ID ${req.id}`))
    ).subscribe({
      next: (data) => {
        this.fullDetailRequest = data;
        this.loadingFullDetails = false;
      },
      error: (err) => {
        // handleError should have already set loadingFullDetails and fullDetailsError
        console.error('Subscription error after handleError for details:', err);
      }
    });
  }

  exitFullDetails(): void {
    this.showFullDetails = false;
    this.fullDetailRequest = undefined;
    this.fullDetailsError = null;
    this.selectedRequest = undefined;
  }

  refreshNo(): void {
    this.fetchRequests();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  selectedRequest?: RequestData;
  selectRequest(req: RequestData): void {
    if (!this.showFullDetails) {
      this.selectedRequest = req;
    }
  }

  get totalRequests(): number {
    return this.requestList?.length || 0;
  }

  get successfulRequests(): number {
    return this.requestList?.filter(r => r.status >= 200 && r.status < 300).length || 0;
  }

  get failedRequests(): number {
    return this.requestList?.filter(r => r.status >= 400).length || 0;
  }

  shortUrl(url: string): string {
    if (!url) return '';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `http://dummy.com${url}`);
      const pathname = urlObj.pathname;
      const maxLength = 40;
      return pathname.length > maxLength ? pathname.substring(0, maxLength - 3) + '...' : pathname;
    } catch {
      const maxLength = 40;
      return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
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
        return ts;
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
      if (dataStr.trim().startsWith('{') || dataStr.trim().startsWith('[')) {
        const parsed = JSON.parse(dataStr);
        return JSON.stringify(parsed, null, 2);
      }
      return dataStr;
    } catch {
      return String(data);
    }
  }

  /**
   * Generic error handler for HTTP requests.
   *
   * @param operation - Name of the operation that failed.
   * @param result - Optional value to return as the observable result.
   * @param isFullDetails - True if handling error for full request details.
   * @param context - Additional context for the error message.
   */
  private handleError<T>(operation = 'operation', result?: T, isFullDetails: boolean = false, context: string = ''): (error: HttpErrorResponse) => Observable<T> {
    return (httpError: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, httpError);

      let userMessage = `Failed to ${operation}.`;
      // The loading and error states are set within the logic below based on 'isFullDetails'
      // No need to declare target states as separate variables here.

      if (context) {
        userMessage = `Failed to load ${context}.`;
      }

      if (httpError.error instanceof ErrorEvent) {
        userMessage = `Network error: Cannot connect to backend server. Please ensure the server is running.`;
      } else {
        switch (httpError.status) {
          case 0: // This often indicates a network issue or CORS block
            userMessage = `Network error: Cannot connect to backend server. Please ensure the server is running and accessible at ${this.API_BASE_URL}.`;
            break;
          case 404:
            userMessage = `Resource not found. The API endpoint might be incorrect or the item does not exist.`;
            if (isFullDetails) userMessage = `${context} not found.`;
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            userMessage = `Backend server error (${httpError.status}). The server or database might be unavailable.`;
            break;
          default:
            userMessage = `An error occurred (${httpError.status}): ${httpError.message || httpError.statusText}`;
        }
      }

      // Set component's error state
      if (isFullDetails) {
        this.fullDetailsError = userMessage;
        this.loadingFullDetails = false;
      } else {
        this.error = userMessage;
        this.loading = false;
      }

      return of(result as T);
    };
  }
}