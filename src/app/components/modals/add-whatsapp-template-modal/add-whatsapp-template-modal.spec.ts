import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddWhatsappTemplateModal } from './add-whatsapp-template-modal';

describe('AddWhatsappTemplateModal', () => {
  let component: AddWhatsappTemplateModal;
  let fixture: ComponentFixture<AddWhatsappTemplateModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddWhatsappTemplateModal],
    }).compileComponents();

    fixture = TestBed.createComponent(AddWhatsappTemplateModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
