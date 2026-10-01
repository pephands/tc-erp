import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Occasions } from './occasions';

describe('Occasions', () => {
  let component: Occasions;
  let fixture: ComponentFixture<Occasions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Occasions],
    }).compileComponents();

    fixture = TestBed.createComponent(Occasions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
