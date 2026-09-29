import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReferenceLeads } from './reference-leads';

describe('ReferenceLeads', () => {
  let component: ReferenceLeads;
  let fixture: ComponentFixture<ReferenceLeads>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferenceLeads],
    }).compileComponents();

    fixture = TestBed.createComponent(ReferenceLeads);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
