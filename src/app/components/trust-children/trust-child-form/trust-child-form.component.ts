import { Component, Input, ViewChild, ElementRef, ViewEncapsulation, OnChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrustChildRecord } from '../../../services/trust-children.service';
import { Endpoint } from '../../../http/endpoint';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-trust-child-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trust-child-form.component.html',
  styleUrls: ['./trust-child-form.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TrustChildFormComponent implements OnChanges {
  @Input() record!: TrustChildRecord | null;
  @Input() branch!: any | null;
  @ViewChild('pdfPage') pdfPage!: ElementRef;

  private endpoint = inject(Endpoint);
  private cdr = inject(ChangeDetectorRef);

  age: string = 'N/A';
  personImageSrc: string | null = null;

  constructor() {}

  ngOnChanges(): void {
    this.updateAge();
    this.syncPersonImage();
  }

  private updateAge(): void {
    if (this.record && this.record.date_of_birth) {
      const dob = new Date(this.record.date_of_birth);
      const diff_ms = Date.now() - dob.getTime();
      const age_dt = new Date(diff_ms); 
      this.age = Math.abs(age_dt.getUTCFullYear() - 1970) + ' YEARS';
    } else {
      this.age = 'N/A';
    }
  }

  private getFullImageUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const baseUrl = this.endpoint.baseUrl.endsWith('/')
      ? this.endpoint.baseUrl.slice(0, -1)
      : this.endpoint.baseUrl;
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (!cleanPath.startsWith('media/')) {
      cleanPath = 'media/' + cleanPath;
    }
    return `${baseUrl}/${cleanPath}`;
  }

  private async syncPersonImage(): Promise<void> {
    if (this.record?.person_image) {
      const fullUrl = this.getFullImageUrl(this.record.person_image);
      try {
        this.personImageSrc = await this.fetchImageAsDataUrl(fullUrl);
      } catch {
        this.personImageSrc = fullUrl;
      }
    } else {
      this.personImageSrc = null;
    }
    this.cdr.detectChanges();
  }

  async prepareForPdf(childRecord: TrustChildRecord | null, branchRecord?: any): Promise<void> {
    if (childRecord) {
      this.record = childRecord;
    }
    if (branchRecord) {
      this.branch = branchRecord;
    }
    this.updateAge();

    if (this.record?.person_image) {
      const fullUrl = this.getFullImageUrl(this.record.person_image);
      try {
        this.personImageSrc = await this.fetchImageAsDataUrl(fullUrl);
      } catch (err) {
        console.warn('Fallback to direct image URL for PDF', err);
        this.personImageSrc = fullUrl;
      }
    } else {
      this.personImageSrc = null;
    }
    this.cdr.detectChanges();
  }

  private fetchImageAsDataUrl(url: string): Promise<string> {
    if (!url) return Promise.reject(new Error('Empty URL'));
    if (url.startsWith('data:')) return Promise.resolve(url);

    return new Promise((resolve) => {
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl);
          };
          reader.onerror = () => resolve(url);
          reader.readAsDataURL(blob);
        })
        .catch(fetchErr => {
          console.warn('Direct fetch failed, falling back to Image canvas load:', fetchErr);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
              } else {
                resolve(url);
              }
            } catch {
              resolve(url);
            }
          };
          img.onerror = () => resolve(url);
          img.src = url;
        });
    });
  }

  async generatePdfBlob(): Promise<Blob> {
    this.cdr.detectChanges();
    const element = this.pdfPage.nativeElement;
    
    // Ensure any img elements inside are loaded
    const images = element.querySelectorAll('img');
    const imageLoadPromises = Array.from(images).map((img: any) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });
    await Promise.all(imageLoadPromises);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // If person image is available, draw it directly into the passport photo container to ensure 100% rendering fidelity
    if (this.personImageSrc) {
      try {
        let posX = 157;
        let posY = 58;
        let posW = 35;
        let posH = 45;

        const container = element.querySelector('.passport-photo-container') as HTMLElement;
        if (container) {
          const elementRect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (elementRect.width > 0 && elementRect.height > 0) {
            const mmPerPxX = pdfWidth / elementRect.width;
            const mmPerPxY = 297 / elementRect.height;
            posX = (containerRect.left - elementRect.left) * mmPerPxX;
            posY = (containerRect.top - elementRect.top) * mmPerPxY;
            posW = containerRect.width * mmPerPxX;
            posH = containerRect.height * mmPerPxY;
          }
        }

        const format = this.personImageSrc.includes('png') ? 'PNG' : 'JPEG';
        // Inset slightly by 0.2mm so the passport border remains neatly framed
        pdf.addImage(this.personImageSrc, format, posX + 0.2, posY + 0.2, posW - 0.4, posH - 0.4);
      } catch (err) {
        console.warn('Direct jsPDF addImage warning:', err);
      }
    }

    return pdf.output('blob');
  }
}
