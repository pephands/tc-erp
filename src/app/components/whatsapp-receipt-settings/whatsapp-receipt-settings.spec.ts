import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsappReceiptSettings } from './whatsapp-receipt-settings';

describe('WhatsappReceiptSettings', () => {
  let component: WhatsappReceiptSettings;
  let fixture: ComponentFixture<WhatsappReceiptSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsappReceiptSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsappReceiptSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
