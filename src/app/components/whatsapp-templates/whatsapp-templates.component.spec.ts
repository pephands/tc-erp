import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsappTemplates } from './whatsapp-templates';

describe('WhatsappTemplates', () => {
  let component: WhatsappTemplates;
  let fixture: ComponentFixture<WhatsappTemplates>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsappTemplates],
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsappTemplates);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
