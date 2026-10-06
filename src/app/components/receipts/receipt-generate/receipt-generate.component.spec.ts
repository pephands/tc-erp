import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaavaiReceipt } from './paavai-receipt';

describe('PaavaiReceipt', () => {
  let component: PaavaiReceipt;
  let fixture: ComponentFixture<PaavaiReceipt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaavaiReceipt],
    }).compileComponents();

    fixture = TestBed.createComponent(PaavaiReceipt);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
