import { Component, Input, ViewChild, ElementRef, ViewEncapsulation, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrustChildRecord } from '../../../services/trust-children.service';
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

  age: string = 'N/A';

  constructor() {}

  ngOnChanges(): void {
    if (this.record && this.record.date_of_birth) {
      const dob = new Date(this.record.date_of_birth);
      const diff_ms = Date.now() - dob.getTime();
      const age_dt = new Date(diff_ms); 
      this.age = Math.abs(age_dt.getUTCFullYear() - 1970) + ' YEARS';
    } else {
      this.age = 'N/A';
    }
  }

  async generatePdfBlob(): Promise<Blob> {
    const element = this.pdfPage.nativeElement;
    
    // Instead of html2pdf, let's use html2canvas + jsPDF explicitly like the receipt generator
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob');
  }
}
