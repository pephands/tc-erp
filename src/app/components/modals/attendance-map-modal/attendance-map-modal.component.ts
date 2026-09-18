import { Component, EventEmitter, Input, Output, OnDestroy, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceRecord } from '../../../models/attendance.model';
import * as L from 'leaflet';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-attendance-map-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-map-modal.component.html',
  styleUrl: './attendance-map-modal.component.css'
})
export class AttendanceMapModalComponent implements AfterViewInit, OnDestroy {
  @Input() attendanceRecords: AttendanceRecord[] = [];
  @Output() closeModal = new EventEmitter<void>();

  @ViewChild('mapContainer') mapContainer!: ElementRef;
  private map: L.Map | undefined;
  private toastService = inject(ToastService);

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    if (typeof window === 'undefined') return;

    // Filter records that have location data
    const recordsWithLocation = this.attendanceRecords.filter(r => 
      r.originalItem && 
      r.originalItem.latitude && 
      r.originalItem.longitude
    );

    if (recordsWithLocation.length === 0) {
      this.toastService.warning('No Locations', 'None of the displayed records have location data.');
      return;
    }

    // Default center to the first record, or average them
    const firstLat = parseFloat(recordsWithLocation[0].originalItem.latitude);
    const firstLng = parseFloat(recordsWithLocation[0].originalItem.longitude);

    this.map = L.map(this.mapContainer.nativeElement).setView([firstLat, firstLng], 12);

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: 'Map data &copy; <a href="https://www.google.com/maps">Google</a>'
    }).addTo(this.map);

    // Using unpkg for default marker icons because angular won't serve them from leaflet/dist by default unless configured
    const iconDefault = L.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });

    const bounds = L.latLngBounds([]);

    // Add markers
    recordsWithLocation.forEach(record => {
      const lat = parseFloat(record.originalItem.latitude);
      const lng = parseFloat(record.originalItem.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = L.marker([lat, lng], { icon: iconDefault }).addTo(this.map!);
        
        const popupContent = `
          <div style="font-family: var(--font-main); min-width: 150px;">
            <h4 style="margin: 0 0 5px 0; color: var(--primary); font-size: 14px;">${record.tcName || 'Unknown'}</h4>
            <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-muted);">Emp ID: <strong>${record.tcId || 'NA'}</strong></p>
            <p style="margin: 0; font-size: 11px; color: var(--text-dim);">Check-in: ${record.inTime}</p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        bounds.extend([lat, lng]);
      }
    });

    // Fit map to markers bounds
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
}
