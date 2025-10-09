// src/app/pages/request-details/request-details.ts (Assumed Content)
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router'; // Assuming you'll use the ID from the route

@Component({
  selector: 'app-request-details', // Make sure this matches your usage if any
  templateUrl: './request-details.html', // Or .component.html, depending on your setup
  styleUrls: ['./request-details.scss'] // Or .component.scss
})
export class RequestDetailsComponent implements OnInit { // <<< IMPORTANT: 'export' keyword and correct class name

  requestId: string | null = null;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    // Example: Get the 'id' from the route parameter
    this.requestId = this.route.snapshot.paramMap.get('id');
    console.log('Request ID:', this.requestId);
  }
}