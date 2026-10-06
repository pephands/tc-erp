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

  async generatePdfBlob(isBatch: boolean = false): Promise<Blob> {
    const element = this.receiptPage.nativeElement;
    const scale = isBatch ? 1.5 : 2;
    const quality = isBatch ? 0.7 : 0.98;
    const canvas = await html2canvas(element, { scale: scale });
    const imgData = canvas.toDataURL('image/jpeg', quality);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob');
  }
}
