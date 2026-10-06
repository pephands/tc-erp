import { Component, Input, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnlinePaymentRecord } from '../../../models/payment.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-receipt-generate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipt-generate.component.html',
  styleUrls: ['./receipt-generate.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ReceiptGenerateComponent {
  @Input() record!: OnlinePaymentRecord | null;
  @ViewChild('receiptPage') receiptPage!: ElementRef;

  constructor() {}

  async generatePdfBlob(): Promise<Blob> {
    const element = this.receiptPage.nativeElement;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob');
  }
}
