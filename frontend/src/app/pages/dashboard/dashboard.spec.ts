import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DashboardComponent } from './dashboard';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpTestingController: HttpTestingController;
  let router: Router;

  // Mock RequestData for testing
  const mockRequestList = [
    { id: 1, url: 'http://localhost/api/users', method: 'GET', status: 200, duration: 100, timestamp: '2023-10-26T10:00:00Z' },
    { id: 2, url: 'http://localhost/api/login', method: 'POST', status: 401, duration: 150, timestamp: '2023-10-26T10:01:00Z' },
    { id: 3, url: 'http://localhost/api/products', method: 'PUT', status: 204, duration: 50, timestamp: '2023-10-26T10:02:00Z' },
    { id: 4, url: 'http://localhost/api/errors', method: 'GET', status: 500, duration: 200, timestamp: '2023-10-26T10:03:00Z' },
  ];

  const mockFullRequestDetails = {
    1: {
      id: 1, url: 'http://localhost/api/users', method: 'GET', status: 200, duration: 100, timestamp: '2023-10-26T10:00:00Z',
      requestBody: null, requestHeaders: { 'Accept': 'application/json' }, requestCookies: [],
      responseBody: JSON.stringify([{ name: 'Test User' }], null, 2), responseHeaders: { 'Content-Type': 'application/json' }, responseCookies: []
    },
    2: {
      id: 2, url: 'http://localhost/api/login', method: 'POST', status: 401, duration: 150, timestamp: '2023-10-26T10:01:00Z',
      requestBody: JSON.stringify({ user: 'test' }), requestHeaders: { 'Content-Type': 'application/json' }, requestCookies: [],
      responseBody: JSON.stringify({ message: 'Unauthorized' }), responseHeaders: { 'Content-Type': 'application/json' }, responseCookies: []
    },
    3: {
      id: 3, url: 'http://localhost/api/products', method: 'PUT', status: 204, duration: 50, timestamp: '2023-10-26T10:02:00Z',
      requestBody: JSON.stringify({ product: 'New Product' }), requestHeaders: { 'Content-Type': 'application/json' }, requestCookies: [],
      responseBody: null, responseHeaders: {}, responseCookies: []
    },
    4: {
      id: 4, url: 'http://localhost/api/errors', method: 'GET', status: 500, duration: 200, timestamp: '2023-10-26T10:03:00Z',
      requestBody: null, requestHeaders: { 'Accept': 'application/json' }, requestCookies: [],
      responseBody: JSON.stringify({ error: 'Server crashed' }), responseHeaders: { 'Content-Type': 'application/json' }, responseCookies: []
    }
  };


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]) // Provide an empty array for routes
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.detectChanges(); // Initial data binding
  });

  afterEach(() => {
    httpTestingController.verify(); // Ensure that there are no outstanding requests.
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch requests on ngOnInit', fakeAsync(() => {
    component.ngOnInit(); // ngOnInit is called in beforeEach, but calling explicitly for clarity in test

    const reqList = httpTestingController.expectOne('http://localhost:3000/requests');
    expect(reqList.request.method).toEqual('GET');
    reqList.flush(mockRequestList); // Respond to the request list call

    // Now, expect detail calls for each item in the list
    for (const req of mockRequestList) {
      const detailReq = httpTestingController.expectOne(`http://localhost:3000/requests/${req.id}`);
      expect(detailReq.request.method).toEqual('GET');
      detailReq.flush(mockFullRequestDetails[req.id as number]);
    }
    tick(); // Advance the async operations for detail requests

    expect(component.requestList.length).toBe(mockRequestList.length);
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.requestList[0].requestHeaders).toEqual(mockFullRequestDetails[1].requestHeaders); // Check if details were merged
  }));

  it('should handle fetch requests error', fakeAsync(() => {
    component.ngOnInit();

    const req = httpTestingController.expectOne('http://localhost:3000/requests');
    req.error(new ErrorEvent('Network error')); // Simulate a network error
    tick(); // Advance the async operations

    expect(component.loading).toBeFalse();
    expect(component.error).toBe('Failed to load the request list. Please ensure the backend server is running.');
    expect(component.requestList.length).toBe(0);
  }));

  it('should refresh requests when refreshNo is called', fakeAsync(() => {
    component.refreshNo();

    const reqList = httpTestingController.expectOne('http://localhost:3000/requests');
    reqList.flush(mockRequestList);

    for (const req of mockRequestList) {
      const detailReq = httpTestingController.expectOne(`http://localhost:3000/requests/${req.id}`);
      detailReq.flush(mockFullRequestDetails[req.id as number]);
    }
    tick();

    expect(component.requestList.length).toBe(mockRequestList.length);
    expect(component.loading).toBeFalse();
  }));

  it('should navigate to login on logout', () => {
    spyOn(localStorage, 'removeItem');
    component.logout();
    expect(localStorage.removeItem).toHaveBeenCalledWith('isLoggedIn');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should select a request', () => {
    const mockReq = mockRequestList[0];
    component.selectRequest(mockReq as any); // Cast as any because mockReq isn't full RequestData
    expect(component.selectedRequest).toEqual(mockReq as any);
  });

  it('should clear selected request', () => {
    component.selectedRequest = mockRequestList[0] as any;
    component.clearSelection();
    expect(component.selectedRequest).toBeUndefined();
  });

  it('should navigate to detail page on openDetailPage', () => {
    const mockReq = mockRequestList[0];
    component.openDetailPage(mockReq as any);
    expect(router.navigate).toHaveBeenCalledWith(['/request-detail', mockReq.id]);
  });

  it('should return short URL', () => {
    expect(component.shortUrl('http://example.com/very/long/path/to/resource/that/is/really/long/and/goes/on')).toBe('/very/long/path/to/resource/that/is/re...');
    expect(component.shortUrl('http://example.com/short')).toBe('/short');
    expect(component.shortUrl('')).toBe('');
    expect(component.shortUrl('invalid-url-string')).toBe('invalid-url-string');
  });

  it('should return correct status class', () => {
    expect(component.getStatusClass(200)).toBe('status-success');
    expect(component.getStatusClass(201)).toBe('status-success');
    expect(component.getStatusClass(400)).toBe('status-failed');
    expect(component.getStatusClass(500)).toBe('status-failed');
    expect(component.getStatusClass(302)).toBe('status-other');
    expect(component.getStatusClass(101)).toBe('status-other');
  });

  it('should calculate total requests', () => {
    component.requestList = mockRequestList as any;
    expect(component.totalRequests).toBe(4);
  });

  it('should calculate successful requests', () => {
    component.requestList = mockRequestList as any;
    expect(component.successfulRequests).toBe(2); // 200, 204
  });

  it('should calculate failed requests', () => {
    component.requestList = mockRequestList as any;
    expect(component.failedRequests).toBe(2); // 401, 500
  });

  it('should format date correctly', () => {
    expect(component.formatDate('2023-10-26T10:00:00Z')).toContain('10/26/2023'); // locale-dependent
    expect(component.formatDate('')).toBe('');
  });

  it('should format JSON data', () => {
    const jsonString = '{"key": "value", "num": 123}';
    const jsonObject = { key: 'value', num: 123 };
    const plainText = 'This is plain text.';
    const emptyString = '';
    const nullValue = null;

    expect(component.formatJson(jsonString)).toBe(JSON.stringify(JSON.parse(jsonString), null, 2));
    expect(component.formatJson(jsonObject)).toBe(JSON.stringify(jsonObject, null, 2));
    expect(component.formatJson(plainText)).toBe(plainText);
    expect(component.formatJson(emptyString)).toBe('None');
    expect(component.formatJson(nullValue)).toBe('None');
  });
});