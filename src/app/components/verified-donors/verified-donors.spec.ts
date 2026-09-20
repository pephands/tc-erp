import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifiedDonors } from './verified-donors';

describe('VerifiedDonors', () => {
  let component: VerifiedDonors;
  let fixture: ComponentFixture<VerifiedDonors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifiedDonors],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifiedDonors);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
